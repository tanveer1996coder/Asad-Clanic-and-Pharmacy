-- Migration: Create Medicine Reference Database
-- Date: 2025-11-30
-- Description: Create medicine reference table with seed data for common Pakistani medicines

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create medicine_reference table
CREATE TABLE IF NOT EXISTS medicine_reference (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generic_name TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    formula TEXT,
    manufacturer TEXT,
    category TEXT,
    dosage_form TEXT CHECK (dosage_form IN ('tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'powder', 'suppository', 'other')),
    standard_packaging TEXT,
    strength TEXT,
    prescription_required BOOLEAN DEFAULT false,
    controlled_substance BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint on brand name and strength combination
    CONSTRAINT unique_brand_strength UNIQUE (brand_name, strength)
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_medicine_generic_name ON medicine_reference USING gin(to_tsvector('english', generic_name));
CREATE INDEX IF NOT EXISTS idx_medicine_brand_name ON medicine_reference USING gin(to_tsvector('english', brand_name));
CREATE INDEX IF NOT EXISTS idx_medicine_category ON medicine_reference(category);
CREATE INDEX IF NOT EXISTS idx_medicine_manufacturer ON medicine_reference(manufacturer);
CREATE INDEX IF NOT EXISTS idx_medicine_dosage_form ON medicine_reference(dosage_form);

-- Add comment to explain the table
COMMENT ON TABLE medicine_reference IS 'Master reference database of medicines available in Pakistan';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_medicine_reference_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_medicine_reference_updated_at
    BEFORE UPDATE ON medicine_reference
    FOR EACH ROW
    EXECUTE FUNCTION update_medicine_reference_updated_at();

-- Enable Row Level Security
ALTER TABLE medicine_reference ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read, only authenticated users can write
CREATE POLICY "Allow public read access to medicine_reference"
    ON medicine_reference FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated users to insert medicine_reference"
    ON medicine_reference FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update medicine_reference"
    ON medicine_reference FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete medicine_reference"
    ON medicine_reference FOR DELETE
    USING (auth.role() = 'authenticated');

-- Insert seed data: Common Pakistani medicines
INSERT INTO medicine_reference (generic_name, brand_name, formula, manufacturer, category, dosage_form, standard_packaging, strength, prescription_required, controlled_substance) VALUES
-- Painkillers & Fever
('Paracetamol', 'Panadol', 'Paracetamol', 'GlaxoSmithKline', 'Painkiller/Antipyretic', 'tablet', '10 tablets per strip', '500mg', false, false),
('Paracetamol', 'Calpol', 'Paracetamol', 'GlaxoSmithKline', 'Painkiller/Antipyretic', 'syrup', '60ml bottle', '120mg/5ml', false, false),
('Ibuprofen', 'Brufen', 'Ibuprofen', 'Abbott', 'Painkiller/Anti-inflammatory', 'tablet', '10 tablets per strip', '400mg', false, false),
('Aspirin', 'Disprin', 'Aspirin', 'Reckitt Benckiser', 'Painkiller/Antiplatelet', 'tablet', '12 tablets per strip', '300mg', false, false),
('Diclofenac', 'Voltaren', 'Diclofenac Sodium', 'Novartis', 'Anti-inflammatory', 'tablet', '10 tablets per strip', '50mg', false, false),

-- Antibiotics
('Amoxicillin', 'Augmentin', 'Amoxicillin + Clavulanic Acid', 'GlaxoSmithKline', 'Antibiotic', 'tablet', '10 tablets per strip', '625mg', true, false),
('Azithromycin', 'Zithromax', 'Azithromycin', 'Pfizer', 'Antibiotic', 'tablet', '3 tablets per strip', '500mg', true, false),
('Ciprofloxacin', 'Cipro', 'Ciprofloxacin', 'Bayer', 'Antibiotic', 'tablet', '10 tablets per strip', '500mg', true, false),
('Cefixime', 'Suprax', 'Cefixime', 'Sanofi', 'Antibiotic', 'tablet', '10 tablets per strip', '200mg', true, false),
('Metronidazole', 'Flagyl', 'Metronidazole', 'Sanofi', 'Antibiotic/Antiprotozoal', 'tablet', '10 tablets per strip', '400mg', true, false),

-- Antacids & Digestive
('Omeprazole', 'Losec', 'Omeprazole', 'AstraZeneca', 'Proton Pump Inhibitor', 'capsule', '14 capsules per strip', '20mg', false, false),
('Ranitidine', 'Zantac', 'Ranitidine', 'GlaxoSmithKline', 'H2 Blocker', 'tablet', '10 tablets per strip', '150mg', false, false),
('Antacid', 'Gaviscon', 'Aluminum Hydroxide + Magnesium', 'Reckitt Benckiser', 'Antacid', 'syrup', '200ml bottle', '10ml dose', false, false),
('Domperidone', 'Motilium', 'Domperidone', 'Janssen', 'Antiemetic', 'tablet', '10 tablets per strip', '10mg', false, false),

-- Antihistamines & Allergy
('Cetirizine', 'Zyrtec', 'Cetirizine', 'UCB', 'Antihistamine', 'tablet', '10 tablets per strip', '10mg', false, false),
('Loratadine', 'Claritin', 'Loratadine', 'Bayer', 'Antihistamine', 'tablet', '10 tablets per strip', '10mg', false, false),
('Chlorpheniramine', 'Piriton', 'Chlorpheniramine Maleate', 'GlaxoSmithKline', 'Antihistamine', 'tablet', '10 tablets per strip', '4mg', false, false),

-- Cough & Cold
('Dextromethorphan', 'Benylin', 'Dextromethorphan', 'Johnson & Johnson', 'Cough Suppressant', 'syrup', '100ml bottle', '15mg/5ml', false, false),
('Salbutamol', 'Ventolin', 'Salbutamol', 'GlaxoSmithKline', 'Bronchodilator', 'inhaler', '1 inhaler', '100mcg/dose', false, false),

-- Vitamins & Supplements
('Multivitamin', 'Centrum', 'Multivitamin & Minerals', 'Pfizer', 'Vitamin Supplement', 'tablet', '30 tablets per bottle', 'Daily dose', false, false),
('Vitamin C', 'Redoxon', 'Ascorbic Acid', 'Bayer', 'Vitamin Supplement', 'tablet', '10 tablets per strip', '1000mg', false, false),
('Calcium', 'Caltrate', 'Calcium Carbonate + Vitamin D', 'Pfizer', 'Mineral Supplement', 'tablet', '30 tablets per bottle', '600mg', false, false),
('Iron', 'Feroglobin', 'Iron + Vitamins', 'Vitabiotics', 'Iron Supplement', 'capsule', '30 capsules per bottle', '14mg', false, false),

-- Diabetes
('Metformin', 'Glucophage', 'Metformin', 'Merck', 'Antidiabetic', 'tablet', '10 tablets per strip', '500mg', true, false),
('Glimepiride', 'Amaryl', 'Glimepiride', 'Sanofi', 'Antidiabetic', 'tablet', '10 tablets per strip', '2mg', true, false),

-- Hypertension
('Amlodipine', 'Norvasc', 'Amlodipine', 'Pfizer', 'Antihypertensive', 'tablet', '10 tablets per strip', '5mg', true, false),
('Atenolol', 'Tenormin', 'Atenolol', 'AstraZeneca', 'Beta Blocker', 'tablet', '14 tablets per strip', '50mg', true, false),
('Losartan', 'Cozaar', 'Losartan', 'Merck', 'Antihypertensive', 'tablet', '10 tablets per strip', '50mg', true, false),

-- Cholesterol
('Atorvastatin', 'Lipitor', 'Atorvastatin', 'Pfizer', 'Statin', 'tablet', '10 tablets per strip', '20mg', true, false),
('Simvastatin', 'Zocor', 'Simvastatin', 'Merck', 'Statin', 'tablet', '10 tablets per strip', '20mg', true, false),

-- Antifungal & Skin
('Fluconazole', 'Diflucan', 'Fluconazole', 'Pfizer', 'Antifungal', 'capsule', '1 capsule per strip', '150mg', true, false),
('Clotrimazole', 'Canesten', 'Clotrimazole', 'Bayer', 'Antifungal', 'cream', '20g tube', '1%', false, false),
('Hydrocortisone', 'Cortisone', 'Hydrocortisone', 'Various', 'Corticosteroid', 'cream', '15g tube', '1%', false, false),

-- Eye & Ear
('Tobramycin', 'Tobrex', 'Tobramycin', 'Alcon', 'Antibiotic Eye Drops', 'drops', '5ml bottle', '0.3%', true, false),
('Artificial Tears', 'Refresh', 'Carboxymethylcellulose', 'Allergan', 'Eye Lubricant', 'drops', '10ml bottle', '0.5%', false, false),

-- Contraceptives
('Levonorgestrel', 'Postinor', 'Levonorgestrel', 'Bayer', 'Emergency Contraceptive', 'tablet', '1 tablet per pack', '1.5mg', false, false),

-- Antiparasitics
('Albendazole', 'Zentel', 'Albendazole', 'GlaxoSmithKline', 'Anthelmintic', 'tablet', '1 tablet per strip', '400mg', false, false),
('Mebendazole', 'Vermox', 'Mebendazole', 'Janssen', 'Anthelmintic', 'tablet', '6 tablets per strip', '100mg', false, false),

-- Antidepressants & Anxiety
('Sertraline', 'Zoloft', 'Sertraline', 'Pfizer', 'Antidepressant', 'tablet', '10 tablets per strip', '50mg', true, false),
('Alprazolam', 'Xanax', 'Alprazolam', 'Pfizer', 'Anxiolytic', 'tablet', '10 tablets per strip', '0.5mg', true, true),

-- Anticoagulants
('Warfarin', 'Coumadin', 'Warfarin Sodium', 'Bristol-Myers Squibb', 'Anticoagulant', 'tablet', '10 tablets per strip', '5mg', true, false),
('Aspirin', 'Ecosprin', 'Aspirin', 'USV', 'Antiplatelet', 'tablet', '14 tablets per strip', '75mg', true, false),

-- Muscle Relaxants
('Orphenadrine', 'Norflex', 'Orphenadrine', 'Various', 'Muscle Relaxant', 'tablet', '10 tablets per strip', '100mg', false, false),

-- Anti-nausea
('Ondansetron', 'Zofran', 'Ondansetron', 'GlaxoSmithKline', 'Antiemetic', 'tablet', '10 tablets per strip', '4mg', true, false),

-- Thyroid
('Levothyroxine', 'Eltroxin', 'Levothyroxine Sodium', 'Aspen', 'Thyroid Hormone', 'tablet', '100 tablets per bottle', '50mcg', true, false),

-- Urinary
('Tamsulosin', 'Flomax', 'Tamsulosin', 'Boehringer Ingelheim', 'Alpha Blocker', 'capsule', '10 capsules per strip', '0.4mg', true, false);

-- Add more common medicines as needed
