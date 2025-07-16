"use client";

import { useState, useEffect } from "react";
import { ArrowUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

function FloatingCTA() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
      {/* Book Now Button */}
      <Button
        onClick={scrollToBooking}
        className="hidden bg-travelex-orange text-white hover:bg-travelex-orange/90 md:flex gap-2"
      >
        <Calendar className="h-5 w-5" />
        <span className="font-semibold">Book Now</span>
      </Button>

      {/* Back to Top Button */}
      <Button
        onClick={scrollToTop}
        variant="secondary"
        size="icon"
        className="rounded-full"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
}

export default FloatingCTA; 