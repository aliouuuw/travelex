import { MapPin, Clock, Users, Luggage } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const services = [
  {
    title: "Ottawa ↔ Toronto",
    description: "Direct premium travel between Canada's capital and largest city",
    icon: MapPin,
    features: ["4.5 hour journey", "Multiple daily departures", "City center pickup"],
    badge: "Most Popular",
  },
  {
    title: "Express Routes",
    description: "Fast, comfortable travel with minimal stops",
    icon: Clock,
    features: ["Limited stops", "Priority boarding", "On-time guarantee"],
  },
  {
    title: "Group Travel",
    description: "Perfect for families and business teams",
    icon: Users,
    features: ["Group discounts", "Reserved seating", "Coordinated pickup"],
  },
  {
    title: "Extra Luggage",
    description: "Flexible baggage options for extended trips",
    icon: Luggage,
    features: ["First bag free", "Affordable extra bags", "Secure storage"],
  },
];

function Services() {
  return (
    <section className="py-16 px-8 md:px-16 bg-gray-50">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-travelex-blue">
          Why Choose TravelEx?
        </h2>
        <p className="text-center mb-12 max-w-2xl mx-auto text-lg md:text-xl text-gray-700">
          Experience premium intercity travel with the comfort and convenience you deserve.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <Card
              key={index}
              className="bg-white border-2 border-gray-200 hover:border-travelex-orange flex flex-col h-full shadow-lg transition-all transform hover:scale-105 duration-300 relative"
            >
              <CardHeader className="flex items-center w-full">
                <div className="rounded-full flex items-center justify-center mb-4">
                  <service.icon className="w-8 h-8 text-travelex-orange" />
                </div>
                <CardTitle className="text-xl md:text-2xl mb-2 font-semibold text-travelex-blue text-center">
                  {service.title}
                </CardTitle>

                <CardDescription className="text-gray-600 text-center">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-3">
                  {service.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-3 text-travelex-orange flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              {service.badge && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-travelex-orange text-white">{service.badge}</Badge>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Services;
