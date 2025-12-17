-- Create customer_frequent_items table for quick reorder feature
CREATE TABLE IF NOT EXISTS public.customer_frequent_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    typical_quantity INTEGER DEFAULT 1,
    last_purchased_at TIMESTAMP WITH TIME ZONE,
    purchase_count INTEGER DEFAULT 1,
    organization_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(customer_id, product_id)
);

-- Enable RLS
ALTER TABLE public.customer_frequent_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own frequent items"
ON public.customer_frequent_items FOR SELECT
USING (auth.uid() = organization_id);

CREATE POLICY "Users can insert their own frequent items"
ON public.customer_frequent_items FOR INSERT
WITH CHECK (auth.uid() = organization_id);

CREATE POLICY "Users can update their own frequent items"
ON public.customer_frequent_items FOR UPDATE
USING (auth.uid() = organization_id);

CREATE POLICY "Users can delete their own frequent items"
ON public.customer_frequent_items FOR DELETE
USING (auth.uid() = organization_id);

-- Function to auto-update customer frequent items based on sales
CREATE OR REPLACE FUNCTION update_customer_frequent_items()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if this sale has a customer_id via the invoice
    IF NEW.invoice_id IS NOT NULL THEN
        -- Upsert the frequent item
        INSERT INTO public.customer_frequent_items (
            customer_id,
            product_id,
            typical_quantity,
            last_purchased_at,
            purchase_count,
            organization_id
        )
        SELECT 
            i.customer_id,
            NEW.product_id,
            NEW.quantity,
            NEW.created_at,
            1,
            NEW.organization_id
        FROM public.invoices i
        WHERE i.id = NEW.invoice_id
          AND i.customer_id IS NOT NULL
        ON CONFLICT (customer_id, product_id) 
        DO UPDATE SET
            typical_quantity = GREATEST(
                customer_frequent_items.typical_quantity,
                EXCLUDED.typical_quantity
            ),
            last_purchased_at = EXCLUDED.last_purchased_at,
            purchase_count = customer_frequent_items.purchase_count + 1,
            updated_at = timezone('utc'::text, now());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically track frequent items
CREATE TRIGGER track_frequent_items
    AFTER INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_frequent_items();

-- Create index for better query performance
CREATE INDEX idx_customer_frequent_items_customer ON public.customer_frequent_items(customer_id);
CREATE INDEX idx_customer_frequent_items_product ON public.customer_frequent_items(product_id);
