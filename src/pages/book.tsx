import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  ArrowRight, 
  Users, 
  Star, 
  Car,
  Package,
  CheckCircle,
  Loader2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTripForBooking } from "@/services/convex/tripSearch";
import { useCreatePaymentIntent } from "@/services/convex/payments";
import type { SeatMap } from "@/services/convex/vehicles";
interface BookingFormData {
  pickupStationId: string;
  dropoffStationId: string;
  selectedSeats: string[];
  numberOfBags: number; // Changed from luggageWeight to numberOfBags
  passengerInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
}

// Visual Seat Selection Component
const SeatSelectionGrid = ({ 
  seatMap, 
  selectedSeats, 
  onSeatSelect,
  occupiedSeats = []
}: {
  seatMap: SeatMap;
  selectedSeats: string[];
  onSeatSelect: (seatId: string) => void;
  occupiedSeats?: string[];
}) => {
  if (!seatMap || !seatMap.layout) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Seat map not available for this vehicle</p>
        </div>
      </div>
    );
  }

  const getSeatStatus = (seatId: string) => {
    if (occupiedSeats.includes(seatId)) return 'occupied';
    if (selectedSeats.includes(seatId)) return 'selected';
    return 'available';
  };

  const getSeatClassName = (status: string) => {
    switch (status) {
      case 'occupied':
        return 'bg-red-100 border-red-300 text-red-700 cursor-not-allowed';
      case 'selected':
        return 'bg-brand-orange border-brand-orange text-white cursor-pointer';
      case 'available':
        return 'bg-green-100 border-green-300 text-green-700 cursor-pointer hover:bg-green-200';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Vehicle Front Indicator */}
      <div className="flex justify-center mb-6">
        <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">
          Front of Vehicle
        </div>
      </div>

      {/* Seat Grid */}
      <div className="space-y-2 max-w-md mx-auto">
        {seatMap.layout.map((row: SeatMap['layout'][number]) => (
          <div key={row.row} className="flex justify-center gap-2">
            {row.seats.map((seat: SeatMap['layout'][number]['seats'][number]) => {
              const status = getSeatStatus(seat.id);
              const isClickable = status !== 'occupied';
              
              return (
                <div key={seat.id} className="relative">
                  <button
                    type="button"
                    onClick={() => isClickable && onSeatSelect(seat.id)}
                    disabled={status === 'occupied'}
                    className={`
                      w-10 h-10 border-2 rounded text-xs font-bold flex items-center justify-center
                      transition-all duration-200 ${getSeatClassName(status)}
                    `}
                  >
                    {seat.id}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-100 border-2 border-green-300 rounded"></div>
          <span className="text-sm text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-orange border-2 border-brand-orange rounded"></div>
          <span className="text-sm text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-100 border-2 border-red-300 rounded"></div>
          <span className="text-sm text-muted-foreground">Occupied</span>
        </div>
      </div>
    </div>
  );
};

// Main Booking Page Component
export default function BookingPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  
  // Get search context from URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const searchFromCity = searchParams.get('fromCity');
  const searchToCity = searchParams.get('toCity');
  const fromStationId = searchParams.get('fromStation');
  const toStationId = searchParams.get('toStation');

  // Form state - skip station selection if stations are pre-selected
  const hasPreSelectedStations = fromStationId && toStationId;
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(hasPreSelectedStations ? 1 : 1); // Always start at step 1 (seat selection)
  const [formData, setFormData] = useState<BookingFormData>({
    pickupStationId: fromStationId || '',
    dropoffStationId: toStationId || '',
    selectedSeats: [],
    numberOfBags: 1, // Will be updated when seats are selected
    passengerInfo: {
      fullName: '',
      email: '',
      phone: '',
    },
  });

  // Fetch trip details using Convex
  const trip = useTripForBooking(tripId || "");
  const isLoading = trip === undefined && !!tripId;
  const error = null; // Convex handles errors differently

  // Map station names to IDs when trip data is available
  useMemo(() => {
    if (trip && fromStationId && toStationId) {
      const pickupStation = trip.tripStations.find(s => 
        s.stationName === fromStationId && s.cityName === searchFromCity
      );
      const dropoffStation = trip.tripStations.find(s => 
        s.stationName === toStationId && s.cityName === searchToCity
      );
      
      if (pickupStation && dropoffStation) {
        setFormData(prev => ({
          ...prev,
          pickupStationId: pickupStation.id,
          dropoffStationId: dropoffStation.id,
        }));
      }
    }
  }, [trip, fromStationId, toStationId, searchFromCity, searchToCity]);

  // Calculate pricing based on city names from search context
  const segmentPrice = useMemo(() => {
    if (!trip || !searchFromCity || !searchToCity) return 0;
    
    // Find pricing segment based on city names
    const pricingSegment = trip.pricing.find(p => 
      p.fromCity === searchFromCity && p.toCity === searchToCity
    );
    
    return pricingSegment?.price || 50; // fallback price
  }, [trip, searchFromCity, searchToCity]);

  const luggageFee = useMemo(() => {
    if (!trip?.luggagePolicy || formData.numberOfBags <= formData.selectedSeats.length) {
      return 0; // No fee if bags <= number of passengers (each gets 1 free bag)
    }
    // Calculate fee for additional bags beyond the free allowance
    const totalFreeBags = formData.selectedSeats.length; // 1 free bag per passenger
    const additionalBags = formData.numberOfBags - totalFreeBags;
    const feePerBag = trip.luggagePolicy.excessFeePerKg || 0; // This now represents fee per bag
    return additionalBags * feePerBag;
  }, [trip, formData.numberOfBags, formData.selectedSeats.length]);

  const totalPrice = segmentPrice * formData.selectedSeats.length + luggageFee;

  // Handle form updates
  const updateFormData = (updates: Partial<BookingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSeatSelect = (seatId: string) => {
    const isSelected = formData.selectedSeats.includes(seatId);
    if (isSelected) {
      const newSelectedSeats = formData.selectedSeats.filter(id => id !== seatId);
      updateFormData({
        selectedSeats: newSelectedSeats,
        // Update numberOfBags to match the new number of passengers (free bags)
        numberOfBags: Math.max(newSelectedSeats.length, formData.numberOfBags)
      });
    } else {
      const newSelectedSeats = [...formData.selectedSeats, seatId];
      updateFormData({
        selectedSeats: newSelectedSeats,
        // Update numberOfBags to match the new number of passengers (free bags)
        numberOfBags: Math.max(newSelectedSeats.length, formData.numberOfBags)
      });
    }
  };

  // Create payment intent action
  const createPaymentIntent = useCreatePaymentIntent();
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  const handleSubmit = async () => {
    if (!trip) {
      toast.error('Trip data not available');
      return;
    }

    setIsCreatingPayment(true);
    
    try {
      const paymentData = {
        tripId: trip.tripId,
        passengerInfo: {
          fullName: formData.passengerInfo.fullName,
          email: formData.passengerInfo.email,
          phone: formData.passengerInfo.phone || '',
        },
        pickupStationId: formData.pickupStationId,
        dropoffStationId: formData.dropoffStationId,
        selectedSeats: formData.selectedSeats,
        numberOfBags: formData.numberOfBags,
        totalPrice: totalPrice,
      };
      
      const response = await createPaymentIntent(paymentData);
      
      toast.success('Redirecting to payment...');
      // Navigate to payment page with client secret
      navigate(`/payment/${response.tempBookingId}?client_secret=${response.clientSecret}`);
    } catch (error) {
      toast.error('Failed to create payment session: ' + (error as Error).message);
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Loading and error states
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
          <span className="text-lg text-muted-foreground">Loading trip details...</span>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Trip Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The trip you're looking for could not be found or is no longer available.
            </p>
            <Button asChild>
              <Link to="/search">Back to Search</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const departureTime = new Date(trip.departureTime || "");
  const arrivalTime = new Date(trip.arrivalTime || "");

  // Validation for each step
  const canProceedFromStep1 = formData.selectedSeats.length > 0;
  const canProceedFromStep2 = true; // Luggage is optional
  const canSubmit = formData.passengerInfo.fullName && formData.passengerInfo.email && formData.passengerInfo.phone;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/search')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-heading">Book Your Trip</h1>
            <p className="text-muted-foreground">
              {searchFromCity && searchToCity 
                ? `${searchFromCity} → ${searchToCity} • Complete your booking in a few simple steps`
                : "Complete your booking in a few simple steps"
              }
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {(hasPreSelectedStations ? [1, 2, 3] : [1, 2, 3]).map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${currentStep >= step 
                  ? 'bg-brand-orange text-white' 
                  : 'bg-gray-200 text-gray-500'
                }
              `}>
                {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
              </div>
              {index < 2 && (
                <div className={`w-12 h-0.5 ${currentStep > step ? 'bg-brand-orange' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentStep === 1 && <><Users className="w-5 h-5 text-brand-orange" /> Choose Seats</>}
                  {currentStep === 2 && <><Package className="w-5 h-5 text-brand-orange" /> Luggage Options</>}
                  {currentStep === 3 && <><CheckCircle className="w-5 h-5 text-brand-orange" /> Review & Book</>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Station Summary - Always show since stations are pre-selected */}
                {hasPreSelectedStations && (
                  <div className="mb-6 p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Stations Selected</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Your journey: {searchFromCity} → {searchToCity}
                    </p>
                    <p className="text-lg font-bold text-green-800 mt-2">₵{segmentPrice} per passenger</p>
                  </div>
                )}

                {/* Step 1: Seat Selection */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold mb-2">Select Your Seats</h3>
                      <p className="text-muted-foreground">
                        Choose {formData.selectedSeats.length > 0 ? `${formData.selectedSeats.length} seat${formData.selectedSeats.length > 1 ? 's' : ''}` : 'your preferred seats'} for this journey
                      </p>
                    </div>

                    <SeatSelectionGrid
                      seatMap={trip.vehicleInfo?.seatMap as unknown as SeatMap || {
                        rows: 0,
                        columns: 0,
                        layout: [] as Array<{
                          row: number;
                          seats: Array<{
                            id: string;
                            row: number;
                            column: number;
                            type: 'regular' | 'premium' | 'disabled' | 'empty';
                            available: boolean;
                          }>;
                        }>,
                      }}
                      selectedSeats={formData.selectedSeats}
                      onSeatSelect={handleSeatSelect}
                      occupiedSeats={trip.bookedSeats || []}
                    />

                    {formData.selectedSeats.length > 0 && (
                      <div className="text-center p-4 bg-brand-orange/10 rounded-lg">
                        <p className="font-medium text-brand-orange">
                          Selected: {formData.selectedSeats.join(', ')} 
                          ({formData.selectedSeats.length} seat{formData.selectedSeats.length > 1 ? 's' : ''})
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Luggage Options */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Luggage Information</h3>
                      <p className="text-muted-foreground">Select additional bags to bring on your trip</p>
                    </div>

                    {/* Pricing Summary */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Pricing Summary</span>
                      </div>
                      <div className="text-sm text-blue-800">
                        <p>Base fare: ₵{segmentPrice} per passenger</p>
                        <p>Selected seats: {formData.selectedSeats.length} × ₵{segmentPrice} = ₵{segmentPrice * formData.selectedSeats.length}</p>
                      </div>
                    </div>

                    {trip.luggagePolicy ? (
                      <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 mb-6">
                        <div className="flex items-start gap-3">
                          <Package className="w-5 h-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-green-900 mb-3">{trip.luggagePolicy.name || 'Luggage Policy'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-gray-700">Free bags included</span>
                                </div>
                                <p className="text-green-800 ml-4">
                                  {formData.selectedSeats.length} bag{formData.selectedSeats.length > 1 ? 's' : ''} up to {trip.luggagePolicy.freeWeightKg || 23}kg each included in your ticket
                                </p>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  <span className="text-gray-700">Additional bags</span>
                                </div>
                                <p className="text-green-800 ml-4">₵{(trip.luggagePolicy.excessFeePerKg || 5).toFixed(2)} per additional bag (up to {trip.luggagePolicy.freeWeightKg || 23}kg each)</p>
                              </div>
                            </div>
                            {trip.luggagePolicy.maxBags && (
                              <div className="mt-3 p-3 bg-white/60 rounded border border-green-100">
                                <p className="text-sm text-green-800">
                                  <strong>Maximum:</strong> {(trip.luggagePolicy.maxBags * formData.selectedSeats.length)} additional bags total ({trip.luggagePolicy.maxBags} per passenger)
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 mb-6">
                        <p className="text-yellow-800 text-sm">
                          No specific luggage policy available for this trip. Please contact the driver for details.
                        </p>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium mb-3 block">Total Bags for Your Trip</Label>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateFormData({ numberOfBags: Math.max(formData.selectedSeats.length, formData.numberOfBags - 1) })}
                          disabled={formData.numberOfBags <= formData.selectedSeats.length}
                          className="w-10 h-10 p-0"
                        >
                          -
                        </Button>
                        <div className="text-center min-w-[80px]">
                          <div className="text-2xl font-bold text-brand-orange">{formData.numberOfBags}</div>
                          <div className="text-xs text-muted-foreground">
                            {formData.numberOfBags === formData.selectedSeats.length 
                              ? `${formData.selectedSeats.length} bag${formData.selectedSeats.length > 1 ? 's' : ''} (all free)` 
                              : `${formData.selectedSeats.length} free + ${formData.numberOfBags - formData.selectedSeats.length} additional`
                            }
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateFormData({ numberOfBags: Math.min((trip?.luggagePolicy?.maxBags || 4) * formData.selectedSeats.length + formData.selectedSeats.length, formData.numberOfBags + 1) })}
                          disabled={formData.numberOfBags >= ((trip?.luggagePolicy?.maxBags || 4) * formData.selectedSeats.length + formData.selectedSeats.length)}
                          className="w-10 h-10 p-0"
                        >
                          +
                        </Button>
                      </div>
                      
                      {formData.numberOfBags > formData.selectedSeats.length && trip?.luggagePolicy && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center text-sm">
                            <span>Additional luggage fee ({formData.numberOfBags - formData.selectedSeats.length} additional bag{formData.numberOfBags - formData.selectedSeats.length > 1 ? 's' : ''})</span>
                            <span className="font-semibold text-brand-orange">₵{luggageFee.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Each additional bag up to {trip.luggagePolicy.freeWeightKg || 23}kg • {formData.selectedSeats.length} free bag{formData.selectedSeats.length > 1 ? 's' : ''} included
                          </p>
                        </div>
                      )}

                      {formData.numberOfBags === formData.selectedSeats.length && (
                        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 text-sm text-green-800">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Perfect! {formData.selectedSeats.length} free bag{formData.selectedSeats.length > 1 ? 's' : ''} included in the ticket price.</span>
                          </div>
                        </div>
                      )}

                      {formData.numberOfBags >= ((trip?.luggagePolicy?.maxBags || 4) * formData.selectedSeats.length + formData.selectedSeats.length) && (
                        <p className="text-sm text-amber-600 mt-2">
                          You've reached the maximum number of bags allowed ({formData.selectedSeats.length} free + {(trip?.luggagePolicy?.maxBags || 3) * formData.selectedSeats.length} additional).
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Review & Book */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Passenger Information</h3>
                      <p className="text-muted-foreground">Please confirm your details</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Full Name</Label>
                        <Input
                          value={formData.passengerInfo.fullName}
                          onChange={(e) => updateFormData({
                            passengerInfo: { ...formData.passengerInfo, fullName: e.target.value }
                          })}
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Email</Label>
                        <Input
                          type="email"
                          value={formData.passengerInfo.email}
                          onChange={(e) => updateFormData({
                            passengerInfo: { ...formData.passengerInfo, email: e.target.value }
                          })}
                          placeholder="Enter your email"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium mb-2 block">Phone Number</Label>
                        <Input
                          type="tel"
                          value={formData.passengerInfo.phone}
                          onChange={(e) => updateFormData({
                            passengerInfo: { ...formData.passengerInfo, phone: e.target.value }
                          })}
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>

                    {/* Booking Summary */}
                    <div className="p-6 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-4">Booking Summary</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span>Segment Price ({formData.selectedSeats.length} seat{formData.selectedSeats.length > 1 ? 's' : ''})</span>
                          <span>₵{segmentPrice * formData.selectedSeats.length}</span>
                        </div>
                        {luggageFee > 0 && (
                          <div className="flex justify-between">
                            <span>Additional Luggage ({formData.numberOfBags - formData.selectedSeats.length} additional bag{formData.numberOfBags - formData.selectedSeats.length > 1 ? 's' : ''})</span>
                            <span>₵{luggageFee.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="border-t pt-3">
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total Amount</span>
                            <span className="text-brand-orange">₵{totalPrice}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1) as 1 | 2 | 3)}
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  {currentStep < 3 ? (
                    <Button
                      onClick={() => setCurrentStep(Math.min(3, currentStep + 1) as 1 | 2 | 3)}
                      disabled={
                        (currentStep === 1 && !canProceedFromStep1) ||
                        (currentStep === 2 && !canProceedFromStep2) ||
                        (currentStep === 3 && !canSubmit)
                      }
                      className="bg-brand-orange text-white hover:bg-brand-orange/90"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={!canSubmit || isCreatingPayment}
                      className="bg-brand-orange text-white hover:bg-brand-orange/90"
                    >
                      {isCreatingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Continue to Payment
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trip Details Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-brand-orange" />
                  Trip Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Route Info */}
                <div>
                  <p className="text-sm text-muted-foreground">Route</p>
                  <p className="font-medium">{trip.routeTemplateName || 'Route Template'}</p>
                </div>

                {/* Time Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Departure</p>
                    <p className="font-medium text-sm">
                      {format(departureTime, "MMM dd")}
                    </p>
                    <p className="text-sm">
                      {format(departureTime, "HH:mm")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Arrival</p>
                    <p className="font-medium text-sm">
                      {format(arrivalTime, "MMM dd")}
                    </p>
                    <p className="text-sm">
                      {format(arrivalTime, "HH:mm")}
                    </p>
                  </div>
                </div>

                {/* Driver Info */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white">
                      <Star className="w-4 h-4 text-brand-orange fill-current" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{trip.driverName}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {trip.driverRating.toFixed(1)} rating
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Info */}
                {trip.vehicleInfo && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vehicle</p>
                    <p className="font-medium">
                      {trip.vehicleInfo.make} {trip.vehicleInfo.model} ({trip.vehicleInfo.year})
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{trip.availableSeats} of {trip.totalSeats} seats available</span>
                    </div>
                  </div>
                )}

                {/* Price Summary */}
                {totalPrice > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">Total</span>
                      <span className="text-2xl font-bold text-brand-orange">₵{totalPrice}</span>
                    </div>
                    {formData.selectedSeats.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        For {formData.selectedSeats.length} passenger{formData.selectedSeats.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 