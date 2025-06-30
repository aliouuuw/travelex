-- Add sample luggage policies with standard TravelEx policy
-- Standard policy: Free: 23kg • $5/kg excess • Max: 30kg • Max 3 bags

-- Insert sample luggage policies for existing drivers
INSERT INTO luggage_policies (
    driver_id,
    name,
    description,
    max_weight,
    free_weight,
    fee_per_excess_kg,
    max_bags,
    is_default
)
SELECT 
    p.id as driver_id,
    'Standard TravelEx Policy' as name,
    'Our standard luggage allowance with generous free weight and reasonable excess fees' as description,
    30 as max_weight,        -- Maximum total weight: 30kg
    23 as free_weight,       -- Free allowance: 23kg
    5 as fee_per_excess_kg,  -- $5/kg excess fee
    3 as max_bags,           -- Maximum 3 additional bags
    true as is_default       -- Set as default policy
FROM profiles p 
WHERE p.role = 'driver'
AND NOT EXISTS (
    SELECT 1 FROM luggage_policies lp 
    WHERE lp.driver_id = p.id
);

-- Insert a premium policy option
INSERT INTO luggage_policies (
    driver_id,
    name,
    description,
    max_weight,
    free_weight,
    fee_per_excess_kg,
    max_bags,
    is_default
)
SELECT 
    p.id as driver_id,
    'Premium Luggage Policy' as name,
    'Extended luggage allowance for travelers with more gear' as description,
    40 as max_weight,        -- Maximum total weight: 40kg
    25 as free_weight,       -- Free allowance: 25kg
    4 as fee_per_excess_kg,  -- $4/kg excess fee (slightly lower)
    5 as max_bags,           -- Maximum 5 additional bags
    false as is_default      -- Not default
FROM profiles p 
WHERE p.role = 'driver'
AND EXISTS (
    SELECT 1 FROM luggage_policies lp 
    WHERE lp.driver_id = p.id AND lp.name = 'Standard TravelEx Policy'
);

-- Update existing trips to use the standard luggage policy
UPDATE trips 
SET luggage_policy_id = (
    SELECT lp.id 
    FROM luggage_policies lp 
    WHERE lp.driver_id = trips.driver_id 
    AND lp.is_default = true 
    LIMIT 1
)
WHERE luggage_policy_id IS NULL
AND EXISTS (
    SELECT 1 FROM luggage_policies lp 
    WHERE lp.driver_id = trips.driver_id 
    AND lp.is_default = true
); 