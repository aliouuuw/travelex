import { MapPin, Clock, Users, Luggage, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const services = [
  {
    title: "Ottawa ↔ Toronto",
    description: "Direct premium travel between Canada's capital and largest city.",
    icon: MapPin,
    features: ["4.5 hour journey", "Multiple daily departures", "City center pickup"],
    badge: "Most Popular",
  },
  {
    title: "Express Routes",
    description: "Fast, comfortable travel with minimal stops for a quicker journey.",
    icon: Clock,
    features: ["Limited stops", "Priority boarding", "On-time guarantee"],
  },
  {
    title: "Group Travel",
    description: "Perfect for families, friends, and business teams traveling together.",
    icon: Users,
    features: ["Group discounts", "Reserved seating", "Coordinated pickup options"],
  },
  {
    title: "Extra Luggage",
    description: "Flexible baggage options for when you need to bring a little more.",
    icon: Luggage,
    features: ["First bag free", "Affordable extra bags", "Secure onboard storage"],
  },
];

function Services() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-travelex-blue sm:text-4xl">
            Our Services
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
            We offer a range of services to make your journey comfortable, convenient, and tailored to your needs. From express routes to group bookings, we have you covered.
          </p>
        </div>
        <div className="mt-16 space-y-16">
          {services.map((service, index) => (
            <div
              key={service.title}
              className={`relative flex flex-col-reverse lg:flex-row ${
                index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              } items-center gap-8 lg:gap-16`}
            >
              <div className="lg:w-1/2 lg:pl-16 lg:pr-16">
                {service.badge && (
                    <Badge className="mb-2 bg-travelex-orange text-white">{service.badge}</Badge>
                )}
                <h3 className="text-2xl font-bold tracking-tight text-travelex-blue sm:text-3xl">
                  {service.title}
                </h3>
                <p className="mt-4 text-lg text-gray-600">
                  {service.description}
                </p>
                <ul className="mt-6 space-y-4">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-x-3">
                      <Check
                        className="h-6 w-6 flex-none text-travelex-orange"
                        aria-hidden="true"
                      />
                      <span className="text-base font-leading-7 text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:w-1/2 flex justify-center items-center">
                 <div className="w-48 h-48 lg:w-64 lg:h-64 bg-travelex-blue/5 rounded-full flex items-center justify-center group">
                    <div className="w-36 h-36 lg:w-48 lg:h-48 bg-travelex-orange/10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                      <service.icon
                        className="h-20 w-20 lg:h-24 lg:w-24 text-travelex-orange"
                        aria-hidden="true"
                      />
                    </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Services;
