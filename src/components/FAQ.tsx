"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    question: "How long does the journey take?",
    answer: "The complete journey from Ottawa to Toronto takes approximately 4.5 hours with strategic stops in Kingston and Belleville. We maintain consistent schedules to ensure reliable arrival times."
  },
  {
    question: "What's included in my ticket?",
    answer: "Every ticket includes premium seating, free Wi-Fi, complimentary snacks and water bottle, climate control, and no reservation fees. Your first bag is also included at no extra cost."
  },
  {
    question: "Can I bring extra luggage?",
    answer: "Yes! Your first bag is included free. Additional bags can be added during booking for a small fee. We offer secure storage for all luggage types including business equipment and personal items."
  },
  {
    question: "How many departures are there daily?",
    answer: "We offer multiple daily departures in both directions - typically morning, afternoon, and evening options. Exact schedules vary by day of the week and season."
  },
  {
    question: "Where are the pickup and drop-off locations?",
    answer: "We provide convenient city center locations in Ottawa and Toronto, with additional stops in Kingston and Belleville. Exact addresses are provided upon booking confirmation."
  },
  {
    question: "What if I need to cancel or change my booking?",
    answer: "We offer flexible booking changes up to 24 hours before departure. Cancellation policies vary by fare type - full details are provided during the booking process."
  },
  {
    question: "Is the service wheelchair accessible?",
    answer: "Yes, our vehicles are fully wheelchair accessible and we're committed to providing comfortable travel for all passengers. Please let us know about accessibility needs when booking."
  },
  {
    question: "Do you offer group discounts?",
    answer: "Yes! We offer attractive group rates for 4 or more passengers traveling together. Contact us directly for custom group pricing and coordination."
  }
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 px-8 md:px-16 bg-gray-50">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-4xl font-bold text-center mb-4 text-travelex-blue">
          Frequently Asked Questions
        </h2>
        <p className="text-center text-gray-600 mb-12 text-lg">
          Everything you need to know about traveling with TravelEx
        </p>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="border-2 border-gray-200 hover:border-travelex-orange transition-colors duration-200">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleFAQ(index)}
              >
                <CardTitle className="flex items-center justify-between text-lg text-travelex-blue">
                  <span>{faq.question}</span>
                  {openIndex === index ? (
                    <ChevronUp className="h-5 w-5 text-travelex-orange" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-travelex-orange" />
                  )}
                </CardTitle>
              </CardHeader>
              {openIndex === index && (
                <CardContent className="pt-0">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Still have questions?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="tel:+14383048891" 
              className="bg-travelex-orange text-white px-6 py-3 rounded-lg hover:bg-travelex-orange/90 transition-colors duration-200"
            >
              Call Us: (438) 304-8891
            </a>
            <a 
              href="mailto:admin@travelexride.ca" 
              className="border-2 border-travelex-blue text-travelex-blue px-6 py-3 rounded-lg hover:bg-travelex-blue hover:text-white transition-colors duration-200"
            >
              Email Support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FAQ; 