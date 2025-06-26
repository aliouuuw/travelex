-- =============================================
-- LUGGAGE POLICIES MIGRATION
-- =============================================

-- Create luggage_policies table
create table luggage_policies (
    id uuid primary key default gen_random_uuid(),
    driver_id uuid not null references profiles(id) on delete cascade,
    name varchar not null,
    description text,
    max_weight decimal(6,2) check (max_weight > 0), -- kg, optional limit
    free_weight decimal(6,2) default 0 check (free_weight >= 0), -- kg of free allowance
    fee_per_excess_kg decimal(8,2) default 0 check (fee_per_excess_kg >= 0), -- fee per kg over free allowance
    max_bags integer check (max_bags > 0), -- optional bag count limit
    max_bag_size text, -- optional size description (e.g., "50cm x 40cm x 20cm")
    is_default boolean default false, -- whether this is the driver's default policy
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create index for better performance
create index idx_luggage_policies_driver_id on luggage_policies(driver_id);
create index idx_luggage_policies_default on luggage_policies(driver_id, is_default) where is_default = true;

-- Enable RLS
alter table luggage_policies enable row level security;

-- RLS Policies - Drivers can only manage their own luggage policies
create policy "Drivers can view their own luggage policies" on luggage_policies
    for select using (driver_id = auth.uid() or auth.uid() in (
        select id from profiles where role = 'admin'
    ));

create policy "Drivers can insert their own luggage policies" on luggage_policies
    for insert with check (driver_id = auth.uid() and auth.uid() in (
        select id from profiles where role in ('driver', 'admin')
    ));

create policy "Drivers can update their own luggage policies" on luggage_policies
    for update using (driver_id = auth.uid() and auth.uid() in (
        select id from profiles where role in ('driver', 'admin')
    ));

create policy "Drivers can delete their own luggage policies" on luggage_policies
    for delete using (driver_id = auth.uid() and auth.uid() in (
        select id from profiles where role in ('driver', 'admin')
    ));

-- =============================================
-- LUGGAGE POLICY FUNCTIONS
-- =============================================

-- Function to get all luggage policies for a driver
create or replace function get_driver_luggage_policies(driver_uuid uuid)
returns json as $$
begin
    return (
        select coalesce(
            json_agg(
                json_build_object(
                    'id', lp.id,
                    'name', lp.name,
                    'description', lp.description,
                    'maxWeight', lp.max_weight,
                    'freeWeight', lp.free_weight,
                    'feePerExcessKg', lp.fee_per_excess_kg,
                    'maxBags', lp.max_bags,
                    'maxBagSize', lp.max_bag_size,
                    'isDefault', lp.is_default,
                    'createdAt', lp.created_at,
                    'updatedAt', lp.updated_at
                )
                order by lp.is_default desc, lp.name
            ), '[]'::json
        )
        from luggage_policies lp
        where lp.driver_id = driver_uuid
    );
end;
$$ language plpgsql security definer;

-- Function to create or update a luggage policy
create or replace function save_luggage_policy(
    p_driver_id uuid,
    p_name text,
    p_id uuid default null,
    p_description text default null,
    p_max_weight decimal default null,
    p_free_weight decimal default 0,
    p_fee_per_excess_kg decimal default 0,
    p_max_bags integer default null,
    p_max_bag_size text default null,
    p_is_default boolean default false
)
returns json as $$
declare
    v_policy_id uuid;
    v_result json;
begin
    -- If setting as default, unset all other default policies for this driver
    if p_is_default then
        update luggage_policies 
        set is_default = false, updated_at = now()
        where driver_id = p_driver_id and is_default = true;
    end if;

    -- Insert or update the policy
    if p_id is null then
        -- Insert new policy
        insert into luggage_policies (
            driver_id, name, description, max_weight, free_weight,
            fee_per_excess_kg, max_bags, max_bag_size, is_default
        ) values (
            p_driver_id, p_name, p_description, p_max_weight, p_free_weight,
            p_fee_per_excess_kg, p_max_bags, p_max_bag_size, p_is_default
        ) returning id into v_policy_id;
    else
        -- Update existing policy
        update luggage_policies set
            name = p_name,
            description = p_description,
            max_weight = p_max_weight,
            free_weight = p_free_weight,
            fee_per_excess_kg = p_fee_per_excess_kg,
            max_bags = p_max_bags,
            max_bag_size = p_max_bag_size,
            is_default = p_is_default,
            updated_at = now()
        where id = p_id and driver_id = p_driver_id
        returning id into v_policy_id;
    end if;

    -- Return the saved policy
    select json_build_object(
        'id', lp.id,
        'name', lp.name,
        'description', lp.description,
        'maxWeight', lp.max_weight,
        'freeWeight', lp.free_weight,
        'feePerExcessKg', lp.fee_per_excess_kg,
        'maxBags', lp.max_bags,
        'maxBagSize', lp.max_bag_size,
        'isDefault', lp.is_default,
        'createdAt', lp.created_at,
        'updatedAt', lp.updated_at
    ) into v_result
    from luggage_policies lp
    where lp.id = v_policy_id;

    return v_result;
end;
$$ language plpgsql security definer;

-- Function to delete a luggage policy
create or replace function delete_luggage_policy(p_policy_id uuid, p_driver_id uuid)
returns boolean as $$
declare
    v_row_count integer;
begin
    delete from luggage_policies 
    where id = p_policy_id and driver_id = p_driver_id;
    
    get diagnostics v_row_count = row_count;
    return v_row_count > 0;
end;
$$ language plpgsql security definer;

-- Function to set default luggage policy
create or replace function set_default_luggage_policy(p_policy_id uuid, p_driver_id uuid)
returns boolean as $$
declare
    v_row_count integer;
begin
    -- First, unset all defaults for this driver
    update luggage_policies 
    set is_default = false, updated_at = now()
    where driver_id = p_driver_id and is_default = true;

    -- Then set the specified policy as default
    update luggage_policies 
    set is_default = true, updated_at = now()
    where id = p_policy_id and driver_id = p_driver_id;
    
    get diagnostics v_row_count = row_count;
    return v_row_count > 0;
end;
$$ language plpgsql security definer;

-- Function to calculate luggage fee based on policy
create or replace function calculate_luggage_fee(
    p_policy_id uuid,
    p_luggage_weight decimal
)
returns decimal as $$
declare
    v_policy record;
    v_excess_weight decimal;
    v_fee decimal := 0;
begin
    -- Get the policy details
    select free_weight, fee_per_excess_kg 
    into v_policy
    from luggage_policies 
    where id = p_policy_id;

    if v_policy is null then
        return 0;
    end if;

    -- Calculate excess weight
    v_excess_weight := greatest(0, p_luggage_weight - coalesce(v_policy.free_weight, 0));
    
    -- Calculate fee
    v_fee := v_excess_weight * coalesce(v_policy.fee_per_excess_kg, 0);
    
    return v_fee;
end;
$$ language plpgsql security definer;

-- Grant necessary permissions
grant execute on function get_driver_luggage_policies(uuid) to authenticated;
grant execute on function save_luggage_policy(uuid, text, uuid, text, decimal, decimal, decimal, integer, text, boolean) to authenticated;
grant execute on function delete_luggage_policy(uuid, uuid) to authenticated;
grant execute on function set_default_luggage_policy(uuid, uuid) to authenticated;
grant execute on function calculate_luggage_fee(uuid, decimal) to authenticated; 