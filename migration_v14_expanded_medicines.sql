-- Migration v14: Expanded Medicine Reference Database
-- Date: 2025-12-01
-- Description: Comprehensive list of common Pakistani medicines with verified brand names and manufacturers

-- This migration adds more medicines to the existing medicine_reference table
-- Following the exact format from migration_v9

INSERT INTO medicine_reference (generic_name, brand_name, formula, manufacturer, category, dosage_form, standard_packaging, strength, prescription_required, controlled_substance) VALUES

-- Additional Painkillers & Anti-inflammatory
('Paracetamol', 'Panadol Extra', 'Paracetamol + Caffeine', 'GlaxoSmithKline', 'Painkiller/Antipyretic', 'tablet', '10 tablets per strip', '500mg + 65mg', false, false),
('Ibuprofen', 'Brufen Suspension', 'Ibuprofen', 'Abbott', 'Painkiller/Anti-inflammatory', 'syrup', '100ml bottle', '100mg/5ml', false, false),
('Diclofenac', 'Voltaren Gel', 'Diclofenac Sodium', 'Novartis', 'Anti-inflammatory', 'cream', '30g tube', '1%', false, false),
('Naproxen', 'Naprosyn', 'Naproxen', 'Getz Pharma', 'Painkiller/Anti-inflammatory', 'tablet', '10 tablets per strip', '250mg', false, false),
('Mefenamic Acid', 'Ponstan', 'Mefenamic Acid', 'Pfizer', 'Painkiller/Anti-inflammatory', 'capsule', '10 capsules per strip', '250mg', false, false),
('Tramadol', 'Tramal', 'Tramadol HCl', 'Searle', 'Painkiller', 'capsule', '10 capsules per strip', '50mg', true, false),

-- Additional Antibiotics
('Amoxicillin', 'Amoxil', 'Amoxicillin', 'GlaxoSmithKline', 'Antibiotic', 'capsule', '10 capsules per strip', '500mg', true, false),
('Cefixime', 'Cefiget', 'Cefixime', 'Getz Pharma', 'Antibiotic', 'tablet', '10 tablets per strip', '400mg', true, false),
('Clarithromycin', 'Klacid', 'Clarithromycin', 'Abbott', 'Antibiotic', 'tablet', '10 tablets per strip', '250mg', true, false),
('Levofloxacin', 'Tavanic', 'Levofloxacin', 'Sanofi', 'Antibiotic', 'tablet', '5 tablets per strip', '500mg', true, false),
('Cephalexin', 'Ceporex', 'Cephalexin', 'GlaxoSmithKline', 'Antibiotic', 'capsule', '10 capsules per strip', '500mg', true, false),
('Amoxicillin + Clavulanic Acid', 'Amclav', 'Amoxicillin + Clavulanic Acid', 'Getz Pharma', 'Antibiotic', 'syrup', '60ml bottle', '228mg/5ml', true, false),
('Doxycycline', 'Vibramycin', 'Doxycycline', 'Pfizer', 'Antibiotic', 'capsule', '10 capsules per strip', '100mg', true, false),
('Erythromycin', 'Erythrocin', 'Erythromycin', 'Abbott', 'Antibiotic', 'tablet', '10 tablets per strip', '250mg', true, false),

-- Antacids & Digestive (Expanded)
('Omeprazole', 'Risek', 'Omeprazole', 'Getz Pharma', 'Proton Pump Inhibitor', 'capsule', '14 capsules per strip', '20mg', false, false),
('Esomeprazole', 'Nexium', 'Esomeprazole', 'AstraZeneca', 'Proton Pump Inhibitor', 'tablet', '14 tablets per strip', '40mg', false, false),
('Pantoprazole', 'Pantoloc', 'Pantoprazole', 'Nycomed', 'Proton Pump Inhibitor', 'tablet', '14 tablets per strip', '40mg', false, false),
('Lactulose', 'Duphalac', 'Lactulose', 'Abbott', 'Laxative', 'syrup', '200ml bottle', '3.35g/5ml', false, false),
('Metoclopramide', 'Maxolon', 'Metoclopramide', 'Sanofi', 'Antiemetic', 'tablet', '10 tablets per strip', '10mg', false, false),
('Ondansetron', 'Zofran', 'Ondansetron', 'GlaxoSmithKline', 'Antiemetic', 'tablet', '10 tablets per strip', '8mg', true, false),
('Mebeverine', 'Colofac', 'Mebeverine', 'Abbott', 'Antispasmodic', 'tablet', '10 tablets per strip', '135mg', false, false),

-- Antihistamines & Allergy (Expanded)
('Fexofenadine', 'Fexet', 'Fexofenadine', 'Getz Pharma', 'Antihistamine', 'tablet', '10 tablets per strip', '120mg', false, false),
('Desloratadine', 'Aerius', 'Desloratadine', 'Merck', 'Antihistamine', 'tablet', '10 tablets per strip', '5mg', false, false),
('Levocetirizine', 'Xyzal', 'Levocetirizine', 'UCB', 'Antihistamine', 'tablet', '10 tablets per strip', '5mg', false, false),
('Montelukast', 'Singulair', 'Montelukast', 'Merck', 'Antiasthmatic', 'tablet', '10 tablets per strip', '10mg', false, false),

-- Cough & Cold (Expanded)
('Salbutamol', 'Ventolin Inhaler', 'Salbutamol', 'GlaxoSmithKline', 'Bronchodilator', 'inhaler', '1 inhaler (200 doses)', '100mcg/dose', false, false),
('Salbutamol', 'Salbo HFA', 'Salbutamol', 'Getz Pharma', 'Bronchodilator', 'inhaler', '1 inhaler (200 doses)', '100mcg/dose', false, false),
('Ambroxol', 'Mucosolvan', 'Ambroxol', 'Boehringer Ingelheim', 'Expectorant', 'syrup', '100ml bottle', '30mg/5ml', false, false),
('Guaifenesin', 'Robitussin', 'Guaifenesin', 'Pfizer', 'Expectorant', 'syrup', '100ml bottle', '100mg/5ml', false, false),

-- Vitamins & Supplements (Expanded)
('Multivitamin', 'Surbex Z', 'Multivitamin + Zinc', 'Abbott', 'Vitamin Supplement', 'tablet', '30 tablets per bottle', 'Daily dose', false, false),
('Folic Acid + Iron', 'Iberet Folic', 'Ferrous Sulfate + Folic Acid', 'Abbott', 'Iron Supplement', 'tablet', '30 tablets per bottle', '525mg + 0.8mg', false, false),
('Calcium + Vitamin D', 'Caltrate Plus', 'Calcium + Vitamin D3', 'Pfizer', 'Mineral Supplement', 'tablet', '30 tablets per bottle', '600mg + 400IU', false, false),
('Vitamin B Complex', 'Neurobion', 'Vitamin B1+B6+B12', 'Merck', 'Vitamin Supplement', 'tablet', '10 tablets per strip', 'B-Complex', false, false),
('Omega-3', 'Seven Seas', 'Omega-3 Fatty Acids', 'Seven Seas', 'Supplement', 'capsule', '30 capsules per bottle', '1000mg', false, false),

-- Diabetes (Expanded)
('Metformin', 'Glucophage XR', 'Metformin', 'Merck', 'Antidiabetic', 'tablet', '10 tablets per strip', '1000mg', true, false),
('Gliclazide', 'Diamicron', 'Gliclazide', 'Servier', 'Antidiabetic', 'tablet', '10 tablets per strip', '80mg', true, false),
('Sitagliptin', 'Januvia', 'Sitagliptin', 'Merck', 'Antidiabetic', 'tablet', '10 tablets per strip', '100mg', true, false),
('Insulin Glargine', 'Lantus', 'Insulin Glargine', 'Sanofi', 'Antidiabetic', 'injection', '1 vial (10ml)', '100 units/ml', true, false),
('Dapagliflozin', 'Forxiga', 'Dapagliflozin', 'AstraZeneca', 'Antidiabetic', 'tablet', '10 tablets per strip', '10mg', true, false),

-- Hypertension (Expanded)
('Amlodipine', 'Amcard', 'Amlodipine', 'Getz Pharma', 'Antihypertensive', 'tablet', '10 tablets per strip', '10mg', true, false),
('Bisoprolol', 'Concor', 'Bisoprolol', 'Merck', 'Beta Blocker', 'tablet', '10 tablets per strip', '5mg', true, false),
('Ramipril', 'Tritace', 'Ramipril', 'Sanofi', 'Antihypertensive', 'tablet', '10 tablets per strip', '5mg', true, false),
('Telmisartan', 'Micardis', 'Telmisartan', 'Boehringer Ingelheim', 'Antihypertensive', 'tablet', '10 tablets per strip', '40mg', true, false),
('Valsartan', 'Diovan', 'Valsartan', 'Novartis', 'Antihypertensive', 'tablet', '10 tablets per strip', '80mg', true, false),
('Hydrochlorothiazide', 'Esidrex', 'Hydrochlorothiazide', 'Novartis', 'Diuretic', 'tablet', '10 tablets per strip', '25mg', true, false),

-- Cholesterol (Expanded)
('Rosuvastatin', 'Crestor', 'Rosuvastatin', 'AstraZeneca', 'Statin', 'tablet', '10 tablets per strip', '10mg', true, false),
('Rosuvastatin', 'Rovista', 'Rosuvastatin', 'Getz Pharma', 'Statin', 'tablet', '10 tablets per strip', '20mg', true, false),
('Ezetimibe', 'Ezetrol', 'Ezetimibe', 'Merck', 'Cholesterol Absorption Inhibitor', 'tablet', '10 tablets per strip', '10mg', true, false),
('Fenofibrate', 'Lipanthyl', 'Fenofibrate', 'Abbott', 'Fibrate', 'capsule', '10 capsules per strip', '200mg', true, false),

-- Antifungal & Skin (Expanded)
('Terbinafine', 'Lamisil', 'Terbinafine', 'Novartis', 'Antifungal', 'tablet', '7 tablets per strip', '250mg', true, false),
('Ketoconazole', 'Nizoral', 'Ketoconazole', 'Janssen', 'Antifungal', 'cream', '15g tube', '2%', false, false),
('Betamethasone', 'Betnovate', 'Betamethasone', 'GlaxoSmithKline', 'Corticosteroid', 'cream', '15g tube', '0.1%', false, false),
('Mometasone', 'Elocon', 'Mometasone', 'Merck', 'Corticosteroid', 'cream', '15g tube', '0.1%', false, false),
('Mupirocin', 'Bactroban', 'Mupirocin', 'GlaxoSmithKline', 'Antibiotic Ointment', 'ointment', '5g tube', '2%', false, false),

-- Eye & Ear (Expanded)
('Ciprofloxacin', 'Ciloxan', 'Ciprofloxacin', 'Alcon', 'Antibiotic Eye Drops', 'drops', '5ml bottle', '0.3%', true, false),
('Ofloxacin', 'Exocin', 'Ofloxacin', 'Allergan', 'Antibiotic Eye Drops', 'drops', '5ml bottle', '0.3%', true, false),
('Timolol', 'Timoptic', 'Timolol', 'Merck', 'Glaucoma Eye Drops', 'drops', '5ml bottle', '0.5%', true, false),
('Sodium Hyaluronate', 'Hylo-Fresh', 'Sodium Hyaluronate', 'Ursapharm', 'Eye Lubricant', 'drops', '10ml bottle', '0.1%', false, false),

-- Antiparasitics (Expanded)
('Ivermectin', 'Stromectol', 'Ivermectin', 'Merck', 'Anthelmintic', 'tablet', '4 tablets per strip', '6mg', true, false),
('Praziquantel', 'Biltricide', 'Praziquantel', 'Bayer', 'Anthelmintic', 'tablet', '6 tablets per strip', '600mg', true, false),

-- Antidepressants & Anxiety (Expanded)
('Escitalopram', 'Lexapro', 'Escitalopram', 'Lundbeck', 'Antidepressant', 'tablet', '10 tablets per strip', '10mg', true, false),
('Fluoxetine', 'Prozac', 'Fluoxetine', 'Eli Lilly', 'Antidepressant', 'capsule', '10 capsules per strip', '20mg', true, false),
('Paroxetine', 'Paxil', 'Paroxetine', 'GlaxoSmithKline', 'Antidepressant', 'tablet', '10 tablets per strip', '20mg', true, false),
('Lorazepam', 'Ativan', 'Lorazepam', 'Pfizer', 'Anxiolytic', 'tablet', '10 tablets per strip', '1mg', true, true),
('Clonazepam', 'Rivotril', 'Clonazepam', 'Roche', 'Anxiolytic', 'tablet', '10 tablets per strip', '0.5mg', true, true),

-- Anticoagulants (Expanded)
('Rivaroxaban', 'Xarelto', 'Rivaroxaban', 'Bayer', 'Anticoagulant', 'tablet', '10 tablets per strip', '20mg', true, false),
('Clopidogrel', 'Plavix', 'Clopidogrel', 'Sanofi', 'Antiplatelet', 'tablet', '10 tablets per strip', '75mg', true, false),
('Ticagrelor', 'Brilinta', 'Ticagrelor', 'AstraZeneca', 'Antiplatelet', 'tablet', '10 tablets per strip', '90mg', true, false),

-- Muscle Relaxants (Expanded)
('Cyclobenzaprine', 'Flexeril', 'Cyclobenzaprine', 'Merck', 'Muscle Relaxant', 'tablet', '10 tablets per strip', '10mg', false, false),
('Thiocolchicoside', 'Muscoril', 'Thiocolchicoside', 'Sanofi', 'Muscle Relaxant', 'capsule', '10 capsules per strip', '4mg', false, false),

-- Thyroid (Expanded)
('Levothyroxine', 'Synthroid', 'Levothyroxine Sodium', 'Abbott', 'Thyroid Hormone', 'tablet', '100 tablets per bottle', '100mcg', true, false),
('Carbimazole', 'Neo-Mercazole', 'Carbimazole', 'Amdipharm', 'Antithyroid', 'tablet', '10 tablets per strip', '5mg', true, false),

-- Urinary (Expanded)
('Solifenacin', 'Vesicare', 'Solifenacin', 'Astellas', 'Urinary Antispasmodic', 'tablet', '10 tablets per strip', '5mg', true, false),
('Finasteride', 'Proscar', 'Finasteride', 'Merck', 'BPH Treatment', 'tablet', '10 tablets per strip', '5mg', true, false),

-- Antivirals
('Acyclovir', 'Zovirax', 'Acyclovir', 'GlaxoSmithKline', 'Antiviral', 'tablet', '10 tablets per strip', '400mg', true, false),
('Oseltamivir', 'Tamiflu', 'Oseltamivir', 'Roche', 'Antiviral', 'capsule', '10 capsules per strip', '75mg', true, false),

-- Anticonvulsants
('Levetiracetam', 'Keppra', 'Levetiracetam', 'UCB', 'Anticonvulsant', 'tablet', '10 tablets per strip', '500mg', true, false),
('Carbamazepine', 'Tegretol', 'Carbamazepine', 'Novartis', 'Anticonvulsant', 'tablet', '10 tablets per strip', '200mg', true, false),
('Gabapentin', 'Neurontin', 'Gabapentin', 'Pfizer', 'Anticonvulsant', 'capsule', '10 capsules per strip', '300mg', true, false),
('Pregabalin', 'Lyrica', 'Pregabalin', 'Pfizer', 'Anticonvulsant', 'capsule', '10 capsules per strip', '75mg', true, true),

-- Osteoporosis
('Alendronate', 'Fosamax', 'Alendronate Sodium', 'Merck', 'Osteoporosis', 'tablet', '4 tablets per strip', '70mg', true, false),
('Calcium + Vitamin D3', 'Calcichew D3', 'Calcium Carbonate + Vitamin D3', 'Takeda', 'Mineral Supplement', 'tablet', '30 tablets per bottle', '1250mg + 400IU', false, false),

-- Migraine
('Sumatriptan', 'Imigran', 'Sumatriptan', 'GlaxoSmithKline', 'Antimigraine', 'tablet', '2 tablets per strip', '50mg', true, false),

-- Gout
('Allopurinol', 'Zyloric', 'Allopurinol', 'GlaxoSmithKline', 'Antigout', 'tablet', '10 tablets per strip', '100mg', true, false),
('Colchicine', 'Colchicine', 'Colchicine', 'Various', 'Antigout', 'tablet', '10 tablets per strip', '0.5mg', true, false);
