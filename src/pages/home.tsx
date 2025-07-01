import TravelExBookingFlow from "@/components/TravelExBookingFlow";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Shield, Star } from "lucide-react";
import Services from "@/components/Services";
import Pricing from "@/components/Pricing";
import SafetyComfort from "@/components/SafetyComfort";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import FloatingCTA from "@/components/FloatingCTA";
import ScrollToBookingButton from "@/components/ScrollToBookingButton";

export default function Home() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-travelex-blue/5 to-travelex-orange/5">

      {/* Hero Section */}
      <section className="relative h-[calc(100vh-88px)] min-h-[700px] flex items-center justify-center text-white overflow-hidden">
        <img
          src="/TravelEx_van.png"
          alt="TravelEx Van providing premium intercity travel"
          className="absolute z-0 scale-105 hover:scale-100 transition-transform duration-[20s] w-full h-full object-cover"
        />
        {/* Multi-layered overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-travelex-blue/70 via-black/50 to-black/70 z-10 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-travelex-blue/30 via-transparent to-travelex-orange/20 z-10"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-travelex-orange/10 rounded-full blur-3xl z-10"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-travelex-blue/10 rounded-full blur-3xl z-10"></div>
        
        <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-travelex-orange/20 backdrop-blur-sm border border-travelex-orange/30 rounded-full text-sm font-medium text-travelex-orange mb-8 animate-pulse">
            <Star className="h-4 w-4 mr-2" />
            Canada&apos;s Premier Luxury Coach Service
          </div>
          
          {/* Main headline with enhanced typography */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
              Premium Intercity
            </span>
            <br />
            <span className="bg-gradient-to-r from-travelex-orange via-yellow-400 to-travelex-orange bg-clip-text text-transparent animate-pulse">
              Travel, Redefined.
            </span>
          </h1>
          
          {/* Enhanced description */}
          <p className="text-lg md:text-xl text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed">
            Experience luxury travel across the Greater Toronto Area and Eastern Ontario. 
            Connecting 6 major cities with <span className="text-travelex-orange font-semibold">premium comfort</span> and <span className="text-white font-semibold">reliable service</span>.
          </p>
          
          {/* CTA Button with enhanced styling */}
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-travelex-orange to-yellow-400 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
              <ScrollToBookingButton
                targetId="booking-section"
                size="lg" 
                className="relative bg-travelex-orange hover:bg-travelex-orange/90 text-white text-lg md:text-xl px-8 md:px-12 py-4 md:py-6 rounded-lg font-semibold shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                Book Your Journey Now
              </ScrollToBookingButton>
            </div>
          </div>
        </div>
        
      </section>

      {/* Booking Form Section - ID added for scroll */}
      <section id="booking-section" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-travelex-blue text-center mb-2">Plan Your Trip</h2>
           <p className="text-center text-gray-600 mb-10">
            Select your origin, destination, and travel date to find available trips.
          </p>
          <TravelExBookingFlow redirectToSearch={true} showTitle={false} />
        </div>
      </section>

      {/* Services Section */}
      <Services />

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-travelex-blue mb-4">Why Choose TravelEx?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We&apos;re redefining intercity travel with premium amenities, reliable service, and competitive pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-travelex-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-travelex-orange" />
              </div>
              <h3 className="text-xl font-semibold text-travelex-blue mb-2">Safe & Reliable</h3>
              <p className="text-gray-600">
                Professional drivers, well-maintained vehicles, and comprehensive insurance for your peace of mind.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-travelex-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-travelex-orange" />
              </div>
              <h3 className="text-xl font-semibold text-travelex-blue mb-2">Premium Comfort</h3>
              <p className="text-gray-600">
                Spacious seating, climate control, power outlets, and complimentary refreshments on every trip.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-travelex-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-travelex-orange" />
              </div>
              <h3 className="text-xl font-semibold text-travelex-blue mb-2">Convenient Schedule</h3>
              <p className="text-gray-600">
                Multiple daily departures with convenient pickup locations in each city center and airports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Routes Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-travelex-blue mb-4">Our Network</h2>
            <p className="text-gray-600 mb-8">Connecting 6 major cities across the Greater Toronto Area and Eastern Ontario</p>
            
            {/* Cities Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
              <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
              <div className="w-12 h-12 bg-travelex-orange/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <MapPin className="h-6 w-6 text-travelex-orange" />
                </div>
                <h3 className="font-semibold text-travelex-blue">Ottawa</h3>
                <p className="text-xs text-gray-600">Capital Region</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
                <div className="w-12 h-12 bg-travelex-blue/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <MapPin className="h-6 w-6 text-travelex-blue" />
                </div>
                <h3 className="font-semibold text-travelex-blue">Kingston</h3>
                <p className="text-xs text-gray-600">University City</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
                <div className="w-12 h-12 bg-travelex-blue/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <MapPin className="h-6 w-6 text-travelex-blue" />
                </div>
                <h3 className="font-semibold text-travelex-blue">Oshawa</h3>
                <p className="text-xs text-gray-600">Durham Region</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
                <div className="w-12 h-12 bg-travelex-orange/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <MapPin className="h-6 w-6 text-travelex-orange" />
                </div>
                <h3 className="font-semibold text-travelex-blue">Toronto</h3>
                <p className="text-xs text-gray-600">Downtown Core</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
                <div className="w-12 h-12 bg-travelex-blue/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <MapPin className="h-6 w-6 text-travelex-blue" />
                </div>
                <h3 className="font-semibold text-travelex-blue">Mississauga</h3>
                <p className="text-xs text-gray-600">Peel Region</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border text-center">
                <div className="w-12 h-12 bg-travelex-blue/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <MapPin className="h-6 w-6 text-travelex-blue" />
                </div>
                <h3 className="font-semibold text-travelex-blue">Brampton</h3>
                <p className="text-xs text-gray-600">Peel Region</p>
              </div>
            </div>
          </div>

          {/* Popular Routes */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-center text-travelex-blue mb-8">Popular Routes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h4 className="text-xl font-semibold text-travelex-blue mb-4">Ottawa ↔ Toronto</h4>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>• St. Laurent Mall → Union Station</p>
                  <p>• Downtown Ottawa → Downtown Toronto</p>
                  <p>• Multiple daily departures</p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-travelex-orange">From $89</span>
                  <span className="text-sm text-gray-500">4h 30m</span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h4 className="text-xl font-semibold text-travelex-blue mb-4">Toronto ↔ Mississauga</h4>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>• Union Station → Square One</p>
                  <p>• Pearson Airport connections</p>
                  <p>• Express service available</p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-travelex-orange">From $25</span>
                  <span className="text-sm text-gray-500">45m</span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h4 className="text-xl font-semibold text-travelex-blue mb-4">Ottawa ↔ Kingston</h4>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>• St. Laurent Mall → Queen&apos;s University</p>
                  <p>• Gatineau → Kingston Downtown</p>
                  <p>• Perfect for students & visitors</p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-travelex-orange">From $45</span>
                  <span className="text-sm text-gray-500">2h 15m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Station Examples */}
          <div className="bg-travelex-blue/5 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-center text-travelex-blue mb-6">Convenient Station Locations</h3>
            <p className="text-center text-gray-600 mb-8">We pick you up from convenient, accessible locations in each city</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-travelex-blue mb-2">Ottawa Region</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• St. Laurent Mall (Starbucks)</li>
                  <li>• 140 George St, Ottawa</li>
                  <li>• McDonald&apos;s, Gatineau</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-travelex-blue mb-2">GTA Locations</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Union Station, Toronto</li>
                  <li>• Square One, Mississauga</li>
                  <li>• Bramalea City Centre</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-semibold text-travelex-blue mb-2">Eastern Ontario</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Queen&apos;s University, Kingston</li>
                  <li>• Kingston Downtown</li>
                  <li>• Oshawa Centre</li>
                </ul>
              </div>
            </div>
            
            <p className="text-center text-sm text-gray-500 mt-6">
              * Station locations may vary. Exact pickup points confirmed during booking.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <Pricing />

      {/* Safety & Comfort Section */}
      <SafetyComfort />

      {/* Testimonials Section */}
      <Testimonials />

      {/* FAQ Section */}
      <FAQ />

      {/* CTA Section */}
      <section className="py-20 bg-travelex-blue">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Travel?</h2>
          <p className="text-travelex-blue/80 mb-8 max-w-2xl mx-auto">
            Book your premium intercity travel experience today. Easy booking, comfortable journey, reliable service.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ScrollToBookingButton
              targetId="booking-section"
              size="lg" 
              className="bg-travelex-orange hover:bg-travelex-orange/90 text-white"
            >
              Book Your Trip
            </ScrollToBookingButton>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-travelex-blue">
              <Link to="/lookup">Find My Booking</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Floating CTA */}
      <FloatingCTA />
    </div>
  );
}
