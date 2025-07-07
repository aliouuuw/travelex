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
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import * as z from "zod";
import { 
  useUpdateUserProfile, 
  useGenerateAvatarUploadUrl,
  useSaveAvatar,
  uploadAvatarImage,
  useChangePassword
} from '@/services/convex/users';

// Password schema for validation
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Password Input Component with show/hide functionality
const PasswordInput = ({ 
    value,
    onChange,
    placeholder, 
    showPassword, 
    setShowPassword,
    className = "",
    ...props 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any) => (
    <div className="relative">
        <Input
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`pr-10 ${className}`}
            {...props}
        />
        <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
        >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
    </div>
);

// Password Match Indicator Component
const PasswordMatchIndicator = ({ password, confirmPassword }: { password: string; confirmPassword: string }) => {
    if (!password || !confirmPassword) return null;
    
    const matches = password === confirmPassword;
    return (
        <div className={`flex items-center gap-2 text-xs mt-1 ${matches ? 'text-green-600' : 'text-red-500'}`}>
            {matches ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            <span>{matches ? 'Passwords match' : 'Passwords do not match'}</span>
        </div>
    );
};

// Password Requirements Indicator Component
const PasswordRequirements = ({ password }: { password: string }) => {
    if (!password) return null;
    
    const requirements = [
        { test: password.length >= 8, text: 'At least 8 characters' },
        { test: /[A-Z]/.test(password), text: 'One uppercase letter' },
        { test: /[0-9]/.test(password), text: 'One number' },
        { test: /[^A-Za-z0-9]/.test(password), text: 'One special character' },
    ];
    
    return (
        <div className="text-xs mt-1 space-y-1">
            {requirements.map((req, index) => (
                <div key={index} className={`flex items-center gap-2 ${req.test ? 'text-green-600' : 'text-gray-400'}`}>
                    {req.test ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    <span>{req.text}</span>
                </div>
            ))}
        </div>
    );
};

export default function AccountSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const updateUserProfile = useUpdateUserProfile();
  const generateAvatarUploadUrl = useGenerateAvatarUploadUrl();
  const saveAvatar = useSaveAvatar();
  const changePassword = useChangePassword();

  // Form states
  const [profileForm, setProfileForm] = useState({
    fullName: user?.profile?.fullName || '',
    email: user?.email || '',
    phone: user?.profile?.phone || '',
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Password visibility states
  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setPasswordVisibility(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setSelectedFile(file);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Handle avatar upload if a new image was selected
      if (selectedFile) {
        const loadingToast = toast.loading('Uploading avatar...');
        try {
          await uploadAvatarImage(
            selectedFile,
            generateAvatarUploadUrl,
            saveAvatar
          );
          toast.dismiss(loadingToast);
          toast.success('Avatar updated successfully!');
        } catch (error) {
          toast.dismiss(loadingToast);
          console.error('Avatar upload error:', error);
          toast.error('Failed to upload avatar');
          return; // Don't proceed with profile update if avatar upload fails
        }
      }

      // Update profile information (excluding avatar since it's handled separately)
      if (profileForm.fullName !== user?.profile?.fullName || 
          profileForm.phone !== user?.profile?.phone) {
        await updateUserProfile({
          fullName: profileForm.fullName || undefined,
          phone: profileForm.phone || undefined,
        });
        toast.success('Profile updated successfully!');
      } else if (!selectedFile) {
        toast.info('No changes to save');
      }
      
      // Clear the selected file and preview
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const { mutate: updatePassword, isPending: isUpdatingPassword } = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      return await changePassword({ currentPassword, newPassword });
    },
    onSuccess: () => {
      toast.success("Password updated successfully!");
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (error) => {
      console.error('Password change failed:', error);
      //const errorMessage = error instanceof Error ? error.message : "Failed to update password. Please try again.";
      toast.error("Password update not implemented while logged in... Please log out, click 'forgot password' and follow the instructions to reset your password.");
    },
  });

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (!passwordForm.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    // Validate password strength using schema
    const passwordValidation = passwordSchema.safeParse(passwordForm.newPassword);
    if (!passwordValidation.success) {
      toast.error(passwordValidation.error.errors[0].message);
      return;
    }

    updatePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };

  const handleCurrencyUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
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
                    {!previewUrl && user?.profile?.avatarUrl && (
                      <AvatarImage src={user.profile.avatarUrl} alt="Profile" />
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
                    Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
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
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
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
                    disabled
                    className="opacity-60 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed from this interface
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-brand-orange hover:bg-brand-orange-600 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Updating...' : 'Update Profile'}
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
                  <PasswordInput
                    id="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    showPassword={passwordVisibility.current}
                    setShowPassword={() => togglePasswordVisibility('current')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <PasswordInput
                    id="newPassword"
                    value={passwordForm.newPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                    showPassword={passwordVisibility.new}
                    setShowPassword={() => togglePasswordVisibility('new')}
                  />
                  <PasswordRequirements password={passwordForm.newPassword} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                    showPassword={passwordVisibility.confirm}
                    setShowPassword={() => togglePasswordVisibility('confirm')}
                  />
                  <PasswordMatchIndicator 
                    password={passwordForm.newPassword} 
                    confirmPassword={passwordForm.confirmPassword} 
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={
                    true
                  }
                  className="w-full bg-brand-orange hover:bg-brand-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </Button>
                <p className="text-xs text-muted-foreground bg-red-100 p-2 rounded-md">
                  Password update is not implemented while logged in... Please log out, click 'forgot password' and follow the instructions to reset your password.
                </p>
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