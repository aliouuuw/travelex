import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  User, 
  Lock, 
  Camera, 
  DollarSign, 
  Save,
  ArrowLeft 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updateUserPassword } from '@/services/supabase/auth';
import { useMutation } from '@tanstack/react-query';

export default function AccountSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    fullName: user?.profile?.full_name || '',
    email: user?.email || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [currencySettings, setCurrencySettings] = useState({
    currency: 'USD', // Default currency
    timezone: 'UTC',
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // TODO: Implement profile update API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const { mutate: updatePassword } = useMutation({
    mutationFn: updateUserPassword,
    onSuccess: () => {
      toast.success("Password updated successfully!");
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    updatePassword(passwordForm.newPassword);
  };

  const handleCurrencyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // TODO: Implement currency settings update API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Currency settings updated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update currency settings');
    } finally {
      setIsLoading(false);
    }
  };

  const currencies = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'GHS', label: 'Ghanaian Cedi (₵)' },
    { value: 'NGN', label: 'Nigerian Naira (₦)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
  ];

  const timezones = [
    { value: 'UTC', label: 'UTC (GMT+0)' },
    { value: 'GMT', label: 'GMT (Greenwich Mean Time)' },
    { value: 'EST', label: 'EST (Eastern Standard Time)' },
    { value: 'PST', label: 'PST (Pacific Standard Time)' },
    { value: 'CET', label: 'CET (Central European Time)' },
    { value: 'WAT', label: 'WAT (West Africa Time)' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 pt-20 pb-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences and security</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Image Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    {previewUrl && (
                      <AvatarImage src={previewUrl} alt="Profile preview" />
                    )}
                    {!previewUrl && user?.profile?.avatar_url && (
                      <AvatarImage src={user.profile.avatar_url} alt="Profile" />
                    )}
                    <AvatarFallback className="bg-brand-orange/10 text-brand-orange font-medium text-lg">
                      {getUserInitials(profileForm.fullName || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="profile-image"
                    className="absolute bottom-0 right-0 p-2 bg-brand-orange text-white rounded-full cursor-pointer hover:bg-brand-orange-600 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                  </label>
                  <input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Click the camera icon to upload a new profile picture
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Maximum file size: 5MB
                  </p>
                </div>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-brand-orange hover:bg-brand-orange-600 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Update Profile
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100">
                  <Lock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Update your password</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-brand-orange hover:bg-brand-orange-600 text-white"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Currency & Localization */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Currency & Localization</CardTitle>
                  <CardDescription>Set your preferred currency and timezone</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCurrencyUpdate} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Preferred Currency</Label>
                    <select
                      id="currency"
                      value={currencySettings.currency}
                      onChange={(e) => setCurrencySettings(prev => ({ ...prev, currency: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {currencies.map((currency) => (
                        <option key={currency.value} value={currency.value}>
                          {currency.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={currencySettings.timezone}
                      onChange={(e) => setCurrencySettings(prev => ({ ...prev, timezone: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {timezones.map((timezone) => (
                        <option key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-brand-orange hover:bg-brand-orange-600 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 