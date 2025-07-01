import { Check, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const pricingTiers = [
  {
    name: "Standard",
    price: "89",
    route: "Ottawa ↔ Toronto",
    description: "Perfect for regular travelers",
    features: [
      "Premium comfortable seating",
      "Free seat selection",
      "Free Wi-Fi throughout journey",
      "Complimentary snacks & water",
      "1 bag included (up to 23kg)",
      "Power outlets at every seat",
      "Climate controlled environment"
    ],
    popular: false
  },
  {
    name: "Express",
    price: "109",
    route: "Ottawa ↔ Toronto",
    description: "Faster journey with limited stops",
    features: [
      "All Standard features included",
      "Limited stops for faster travel",
      "Priority boarding",
      "Extra legroom seating",
      "Premium snack selection",
      "Guaranteed on-time arrival"
    ],
    popular: true
  },
  {
    name: "Group Rate",
    price: "79",
    route: "Per person (4+ travelers)",
    description: "Best value for groups",
    features: [
      "All Standard features included",
      "Group discount pricing",
      "Coordinated pickup service",
      "Flexible booking changes",
      "Group travel coordinator",
      "Special event accommodations"
    ],
    popular: false
  }
];

const additionalServices = [
  { service: "Extra Bag (up to 23kg)", price: "$15" },
  { service: "Oversized Bag", price: "$25" },
  { service: "Priority Boarding", price: "$10" },
  { service: "Travel Insurance", price: "$8" },
];

function Pricing() {
  return (
    <section id="pricing-section" className="py-16 px-8 md:px-16 bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-travelex-blue">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            No hidden fees, no surge pricing. Just honest, upfront pricing for premium intercity travel.
          </p>
        </div>

        {/* Main Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {pricingTiers.map((tier, index) => (
            <Card 
              key={index} 
              className={`relative border-2 transition-all duration-300 hover:shadow-xl ${
                tier.popular 
                  ? 'border-travelex-orange shadow-lg scale-105' 
                  : 'border-gray-200 hover:border-travelex-orange'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-travelex-orange text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-travelex-blue">
                  {tier.name}
                </CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-travelex-orange">
                    ${tier.price}
                  </span>
                  <span className="text-gray-600 ml-2">CAD</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{tier.route}</p>
                <p className="text-gray-700 mt-2">{tier.description}</p>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-5 w-5 text-travelex-orange mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${
                    tier.popular 
                      ? 'bg-travelex-orange hover:bg-travelex-orange/90' 
                      : 'bg-travelex-blue hover:bg-travelex-blue/90'
                  } text-white`}
                >
                  Book Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Services */}
        <div className="bg-gray-50 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-center mb-8 text-travelex-blue">
            Optional Add-Ons
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {additionalServices.map((item, index) => (
              <div 
                key={index} 
                className="bg-white p-4 rounded-lg border border-gray-200 text-center hover:border-travelex-orange transition-colors duration-200"
              >
                <h4 className="font-semibold text-gray-800 mb-2">{item.service}</h4>
                <p className="text-2xl font-bold text-travelex-orange">{item.price}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Price Guarantee */}
        <div className="mt-12 text-center bg-travelex-blue text-white p-8 rounded-lg">
          <h3 className="text-2xl font-bold mb-4">Our Price Promise</h3>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            What you see is what you pay. No hidden fees, no surprise charges, no surge pricing. 
            Book with confidence knowing your price is locked in.
          </p>
        </div>
      </div>
    </section>
  );
}

export default Pricing; 