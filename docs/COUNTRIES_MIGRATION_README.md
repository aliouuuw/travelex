# Countries Migration - Senegal & Canada

This migration adds country support to solve the UX scaling problem for city search. Instead of showing thousands of cities in a dropdown, users can now filter by country first.

## What's Changed

### Database Changes
- ✅ New `countries` table with Senegal (🇸🇳) and Canada (🇨🇦)
- ✅ Added `country_id` and `country_code` fields to:
  - `route_template_cities`
  - `reusable_cities` 
  - `trip_stations`
- ✅ Auto-detection function maps your existing cities:
  - **Senegal (SN)**: Dakar, Thiès
  - **Canada (CA)**: Ottawa, Kingston, Toronto
- ✅ New database functions for country-aware search
- ✅ Backward compatibility maintained

### New Services
- ✅ `src/services/countries.ts` - Country management
- ✅ Enhanced `src/services/trip-search.ts` - Country-aware search
- ✅ `src/components/shared/country-city-selector.tsx` - New UI component

### UI Improvements
- ✅ Country selector with flag emojis 🇸🇳 🇨🇦
- ✅ Hierarchical city selection (Country → City)
- ✅ Trip count badges for each location
- ✅ Enhanced search results showing country codes

## Migration Steps

### 1. Run Database Migration
```bash
# Apply the migration
supabase db push

# Or run the specific migration file
supabase migration up 20250110000000_add_countries_to_cities.sql
```

### 2. Verify Data Migration
Check that your existing cities got assigned to the correct countries:
```sql
SELECT 
  rtc.city_name, 
  rtc.country_code, 
  c.name as country_name 
FROM route_template_cities rtc 
LEFT JOIN countries c ON c.code = rtc.country_code 
ORDER BY rtc.city_name;
```

Expected result:
- Dakar → SN (Senegal)
- Thiès → SN (Senegal)  
- Ottawa → CA (Canada)
- Kingston → CA (Canada)
- Toronto → CA (Canada)

### 3. Update Your Search Page (Optional)

Replace your existing city selector with the new country-city selector:

```tsx
// Before (old way)
<Select value={fromCity} onValueChange={setFromCity}>
  <SelectTrigger>
    <SelectValue placeholder="Select city" />
  </SelectTrigger>
  <SelectContent>
    {cities.map(city => (
      <SelectItem key={city.cityName} value={city.cityName}>
        {city.cityName}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// After (new way)
<CountryCitySelector
  selectedCountry={fromCountry}
  selectedCity={fromCity}
  onSelection={(country, city) => {
    setFromCountry(country);
    setFromCity(city);
  }}
  label="From"
/>
```

## Benefits

1. **Scalable UX**: Works with thousands of cities
2. **Better Organization**: Cities grouped by country
3. **Visual Enhancement**: Flag emojis and country context
4. **Backward Compatible**: Existing code still works
5. **Performance**: Indexed for fast queries

## API Usage Examples

### Get Countries
```typescript
import { getAvailableCountries } from '@/services/countries';

const countries = await getAvailableCountries();
// Returns: [{ code: 'SN', name: 'Senegal', flagEmoji: '🇸🇳', ... }]
```

### Get Cities by Country
```typescript
import { getAvailableCitiesByCountry } from '@/services/countries';

const cities = await getAvailableCitiesByCountry();
// Returns cities with country info
```

### Enhanced Trip Search
```typescript
import { searchTripsBySegmentWithCountry } from '@/services/trip-search';

const results = await searchTripsBySegmentWithCountry({
  fromCountry: 'SN',
  fromCity: 'Dakar',
  toCountry: 'CA', 
  toCity: 'Toronto'
});
```

## Adding New Cities/Countries

To add a new city, the system will auto-detect the country. If it can't detect, you can manually assign:

```sql
-- Add a new country
INSERT INTO countries (name, code, flag_emoji) 
VALUES ('Morocco', 'MA', '🇲🇦');

-- Add a city with manual country assignment
INSERT INTO route_template_cities (route_template_id, city_name, country_code, sequence_order)
VALUES (your_route_id, 'Casablanca', 'MA', 1);
```

Or update the detection function in the migration file:
```sql
-- Add to detect_country_for_city function
IF city_name ILIKE ANY(ARRAY['casablanca', 'rabat', 'marrakech']) THEN
  RETURN 'MA';
END IF;
```

## Demo

Check out `src/pages/search-demo.tsx` to see the new country-city selector in action!

## ✅ Route Creation Components Updated

The route creation/editing interface in `src/pages/driver/routes/` has been fully adapted:

### What Changed:
- **Country-City Selection**: Replaced `CityStationInput` with `CountryCitySelector` 
- **Enhanced Route Preview**: Now shows country flags and codes alongside city names
- **Updated Route Listing**: Route flowcharts display country information for better clarity
- **Form Integration**: Country data flows seamlessly through the form validation and submission

### Driver Experience:
```typescript
// Before: Only city selection
{ cityName: "Dakar", stations: [...] }

// After: Country + city selection with auto-detection
{ 
  cityName: "Dakar", 
  countryCode: "SN",
  countryName: "Senegal", 
  flagEmoji: "🇸🇳",
  stations: [...] 
}
```

### Visual Improvements:
- **Route Preview**: Shows `Dakar 🇸🇳 SN` instead of just `Dakar`
- **Route Cards**: Displays country flags in the flowchart for international routes
- **Better UX**: Clear country context prevents confusion between cities with same names

## Route Creation Workflow

The country assignment works seamlessly with your existing route creation workflow:

### Automatic Country Detection
When drivers create routes, cities are automatically assigned countries via database triggers:

```typescript
// Your existing route creation still works
const routeData = {
  name: "Dakar to Toronto Express",
  cities: [
    { cityName: "Dakar", stations: [...] },      // → Auto-assigned SN 🇸🇳
    { cityName: "Ottawa", stations: [...] },     // → Auto-assigned CA 🇨🇦  
    { cityName: "Toronto", stations: [...] }     // → Auto-assigned CA 🇨🇦
  ]
};

await createRouteTemplate(routeData);
```

### Enhanced Route Creation (Optional)
For explicit country control:

```typescript
// Enhanced version with explicit countries
const routeData = {
  name: "Senegal-Canada Route",
  cities: [
    { 
      cityName: "Dakar", 
      countryCode: "SN",
      stations: [...] 
    },
    { 
      cityName: "Toronto", 
      countryCode: "CA", 
      stations: [...] 
    }
  ]
};

await createRouteTemplateWithCountries(routeData);
```

### Route Validation
Validate that route cities have proper country assignments:

```typescript
const validation = await validateRouteCountries(routeId);
// Returns: [{ cityName: "Dakar", countryCode: "SN", isValid: true, ... }]
```

### Data Migration for Existing Routes
If you have existing routes without countries:

```typescript
const updatedCount = await autoAssignCountriesToRoutes();
console.log(`Updated ${updatedCount} routes with country information`);
```

## Database Triggers

The migration includes automatic triggers that:
- Detect country from city name on INSERT/UPDATE
- Assign country_code and country_id automatically  
- Work for both route_template_cities and reusable_cities
- Maintain data consistency

## Need Help?

- All existing functions still work (backward compatible)
- New functions are optional enhancements
- The migration preserves all your existing data
- Auto-detection handles the common city names for Senegal and Canada
- Route creation automatically assigns countries via triggers
- Enhanced functions available for explicit country control

## 🎯 Quick Summary - What Was Updated

### Database Layer ✅
- Added countries table (Senegal, Canada)
- Added country fields to route_template_cities, reusable_cities, trip_stations
- Created auto-detection triggers for existing/new cities
- Updated all route functions to return country data

### Service Layer ✅  
- Enhanced `route-templates.ts` with country support
- Created `countries.ts` service for country management
- Updated `trip-search.ts` with country-aware search
- Maintained backward compatibility

### UI Components ✅
- Updated route creation (`/driver/routes/edit.tsx`) with `CountryCitySelector`
- Enhanced route listing with country flags and codes
- Updated route preview to show country information
- Created search demo with country-city selector

### Result 🎉
- **Seamless Migration**: Your existing routes work unchanged
- **Better UX**: Country context prevents city name confusion  
- **Scalable**: Ready for thousands of cities organized by country
- **International Ready**: Clean separation of Senegalese and Canadian cities 