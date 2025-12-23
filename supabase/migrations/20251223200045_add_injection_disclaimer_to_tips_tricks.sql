/*
  # Add Injection Feature Disclaimer to Tips & Tricks

  1. Changes
    - Append injection feature disclaimer to the tips_tricks content
  
  2. Purpose
    - Make the injection feature disclaimer available in Tips & Tricks
    - Users can reference this disclaimer at any time
*/

-- Update the tips_tricks content to include the injection feature disclaimer
UPDATE tips_tricks
SET content = content || E'\n\n--- INJECTION FEATURE DISCLAIMER ---\n\nIt is your responsibility to properly maintain your drug table with accurate dosages. This feature is an estimator not a veterinarian. It is designed for use in a particular common scenario where injections are administered by ranch personnel for vaccinations or sickness. This feature will help you with the math and save you from reading small labels for dosages over-and-over, but we assume that you have the expertise to know if the App suggests an unreasonable dosage. If you are not already a reasonably qualified animal medical technician, do not use this feature. This feature can also help you estimate the animal\'s weight, but this is only an estimate. If the particular drug is highly dosage sensitive, use a scale rather than this weight estimate. If you cannot do a reasonable job verifying the weight estimate based on experience, do not use this feature.',
    updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND content NOT LIKE '%INJECTION FEATURE DISCLAIMER%';