import { Shield, Heart, Thermometer, Wifi, Zap, Coffee, Users, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const safetyFeatures = [
  {
    icon: Shield,
    title: "Professional Drivers",
    description: "All drivers are professionally trained, licensed, and undergo regular safety assessments"
  },
  {
    icon: CheckCircle,
    title: "Vehicle Inspections",
    description: "Daily safety inspections and regular maintenance ensure optimal vehicle condition"
  },
  {
    icon: Heart,
    title: "Emergency Protocols",
    description: "Comprehensive emergency procedures and first aid equipment on every vehicle"
  },
  {
    icon: Users,
    title: "Passenger Insurance",
    description: "Full passenger insurance coverage for peace of mind during your journey"
  }
];

const comfortFeatures = [
  {
    icon: Thermometer,
    title: "Climate Control",
    description: "Individual climate controls ensure perfect temperature throughout your journey"
  },
  {
    icon: Wifi,
    title: "High-Speed Wi-Fi",
    description: "Complimentary high-speed internet access to stay connected and productive"
  },
  {
    icon: Zap,
    title: "Power Outlets",
    description: "USB and standard power outlets at every seat to keep your devices charged"
  },
  {
    icon: Coffee,
    title: "Premium Refreshments",
    description: "Complimentary snacks, beverages, and water bottles for every passenger"
  }
];

function SafetyComfort() {
  return (
    <section className="py-16 px-8 md:px-16 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-travelex-blue">
            Your Safety & Comfort Come First
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We&apos;re committed to providing the safest, most comfortable intercity travel experience. 
            Every detail is designed with your well-being in mind.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Safety Features */}
          <div>
            <div className="flex items-center mb-8">
              <Shield className="h-8 w-8 text-travelex-orange mr-3" />
              <h3 className="text-3xl font-bold text-travelex-blue">Safety First</h3>
            </div>
            <div className="space-y-6">
              {safetyFeatures.map((feature, index) => (
                <Card key={index} className="border-l-4 border-l-travelex-orange bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <feature.icon className="h-6 w-6 text-travelex-orange mt-1" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-travelex-blue mb-2">
                          {feature.title}
                        </h4>
                        <p className="text-gray-700 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Comfort Features */}
          <div>
            <div className="flex items-center mb-8">
              <Heart className="h-8 w-8 text-travelex-orange mr-3" />
              <h3 className="text-3xl font-bold text-travelex-blue">Premium Comfort</h3>
            </div>
            <div className="space-y-6">
              {comfortFeatures.map((feature, index) => (
                <Card key={index} className="border-l-4 border-l-travelex-blue bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <feature.icon className="h-6 w-6 text-travelex-blue mt-1" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-travelex-blue mb-2">
                          {feature.title}
                        </h4>
                        <p className="text-gray-700 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Comfort Info */}
        <div className="mt-16 bg-travelex-blue text-white p-8 rounded-lg">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <h4 className="text-2xl font-bold mb-2 text-travelex-orange">Premium Seating</h4>
              <p className="opacity-90">Extra legroom, reclining seats with headrests for maximum comfort</p>
            </div>
            <div>
              <h4 className="text-2xl font-bold mb-2 text-travelex-orange">Quiet Environment</h4>
              <p className="opacity-90">Sound-dampened vehicles for a peaceful, relaxing journey</p>
            </div>
            <div>
              <h4 className="text-2xl font-bold mb-2 text-travelex-orange">Clean & Sanitized</h4>
              <p className="opacity-90">Thorough cleaning and sanitization between every trip</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SafetyComfort; 