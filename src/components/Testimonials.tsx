"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Business Consultant, Ottawa",
    testimonial:
      "TravelEx has transformed my weekly trips to Toronto. The comfort is unmatched, and I love that there are no hidden fees. The free Wi-Fi lets me work during the journey, making it incredibly productive.",
    image: "/testimonials/sarah.jpeg",
  },
  {
    name: "David Thompson",
    role: "University Student, Toronto",
    testimonial:
      "As a student traveling between Toronto and Ottawa to visit family, TravelEx is a game-changer. The premium seating and free snacks make the 4.5-hour journey feel much shorter. Much better than other options!",
    image: "/testimonials/david.jpeg",
  },
  {
    name: "Emily Clark",
    role: "Marketing Director, Kingston",
    testimonial:
      "I frequently travel for business meetings in both cities. TravelEx's reliable schedule and comfortable seating mean I arrive refreshed and ready. The extra luggage option is perfect for extended trips.",
    image: "/testimonials/emily.jpeg",
  },
];

function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length
    );
  };

  return (
    <section className="py-16 px-8 md:px-16 bg-white">
      <h2 className="text-4xl font-bold text-center mb-12 text-travelex-blue">
        What Our Travelers Say
      </h2>
      <div className="relative max-w-4xl mx-auto">
        <Card className="p-8 bg-gray-50 border-2 border-gray-200 shadow-lg rounded-lg">
          <CardContent>
            <img
              src={testimonials[currentIndex].image}
              alt={`${testimonials[currentIndex].name} photo`}
              className="w-20 h-20 rounded-full mx-auto mb-6"
              width={100}
              height={100}
            />
            <blockquote className="text-lg text-gray-700 italic mb-6 text-center leading-relaxed">
              &quot;{testimonials[currentIndex].testimonial}&quot;
            </blockquote>
            <p className="text-center text-lg font-semibold text-travelex-blue">
              {testimonials[currentIndex].name}
            </p>
            <p className="text-center text-gray-600">
              {testimonials[currentIndex].role}
            </p>
          </CardContent>
        </Card>
        <div className="flex justify-center mt-8 space-x-4">
          <Button
            variant="outline"
            size="icon"
            className="border-travelex-orange text-travelex-orange hover:bg-travelex-orange hover:text-white transition-all duration-300"
            onClick={prevTestimonial}
          >
            <ChevronLeft className="h-6 w-6" />
            <span className="sr-only">Previous testimonial</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="border-travelex-orange text-travelex-orange hover:bg-travelex-orange hover:text-white transition-all duration-300"
            onClick={nextTestimonial}
          >
            <ChevronRight className="h-6 w-6" />
            <span className="sr-only">Next testimonial</span>
          </Button>
        </div>
        
        {/* Testimonial indicators */}
        <div className="flex justify-center mt-6 space-x-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentIndex === index ? 'bg-travelex-orange' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              onClick={() => setCurrentIndex(index)}
            >
              <span className="sr-only">Testimonial {index + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
