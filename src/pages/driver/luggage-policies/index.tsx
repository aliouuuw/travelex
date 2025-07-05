import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useDriverLuggagePolicies,
  useDeleteLuggagePolicy,
  useSetDefaultLuggagePolicy,
  formatLuggagePolicy,
  type LuggagePolicy
} from "@/services/convex/luggage-policies";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Loader2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Star, 
  StarIcon,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import LuggagePolicyForm from "./form.tsx";

const LuggagePolicyRow = ({ 
  policy, 
  onDelete, 
  onSetDefault 
}: { 
  policy: LuggagePolicy; 
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}) => {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <TableRow className="hover:bg-muted/30 transition-colors">
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{policy.name}</span>
                {policy.isDefault && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <Star className="w-3 h-3 mr-1" />
                    Default
                  </Badge>
                )}
              </div>
              {policy.description && (
                <p className="text-sm text-muted-foreground mt-1">{policy.description}</p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm text-muted-foreground">
            {formatLuggagePolicy(policy)}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {policy.freeWeightKg && policy.freeWeightKg > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {policy.freeWeightKg}kg free
              </Badge>
            )}
            {policy.excessFeePerKg && policy.excessFeePerKg > 0 && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                ${policy.excessFeePerKg}/bag
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(true)}
              className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
            >
              <Edit className="w-4 h-4" />
            </Button>
            {!policy.isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetDefault(policy._id)}
                className="text-yellow-500 hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-700"
                title="Set as default"
              >
                <StarIcon className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(policy._id)}
              className="text-red-500 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      
      {showForm && (
        <tr>
          <td colSpan={4} className="p-0">
            <div className="bg-muted/30 p-4 border-t border-border/40">
              <LuggagePolicyForm 
                policy={policy}
                onClose={() => setShowForm(false)}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};



export default function LuggagePoliciesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch luggage policies
  const policies = useDriverLuggagePolicies();
  const isLoading = policies === undefined;
  const error = null; // Convex handles errors differently

  // Delete policy mutation
  const deletePolicyMutation = useDeleteLuggagePolicy();

  // Set default policy mutation
  const setDefaultMutation = useSetDefaultLuggagePolicy();

  // Filter policies based on search term
  const filteredPolicies = (policies || []).filter((policy) =>
    policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (policy.description && policy.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate stats
  const stats = {
    total: policies?.length || 0,
    default: policies?.filter(p => p.isDefault).length || 0,
    avgFreeWeight: policies && policies.length > 0 
      ? Math.round(policies.reduce((acc, p) => acc + (p.freeWeightKg || 0), 0) / policies.length * 10) / 10
      : 0,
        avgFee: policies && policies.length > 0 
        ? Math.round(policies.reduce((acc, p) => acc + (p.excessFeePerKg || 0), 0) / policies.length * 100) / 100
        : 0
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (window.confirm('Are you sure you want to delete this luggage policy? This action cannot be undone.')) {
      try {
        await deletePolicyMutation({ policyId });
        toast.success('Luggage policy deleted successfully');
      } catch (error: any) {
        toast.error(`Failed to delete policy: ${error.message}`);
      }
    }
  };

  const handleSetDefault = async (policyId: string) => {
    try {
      await setDefaultMutation({ policyId });
      toast.success('Default policy updated successfully');
    } catch (error: any) {
      toast.error(`Failed to update default policy: ${error.message}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
            <span className="text-lg text-muted-foreground">Loading luggage policies...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Luggage Policies
          </h1>
          <p className="text-muted-foreground">
            Manage your luggage allowances and pricing rules
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-brand-orange hover:bg-brand-orange-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Policy
        </Button>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg border border-border/40 p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Policies</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.default}</div>
            <div className="text-sm text-muted-foreground mt-1">Default Policies</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.avgFreeWeight}kg</div>
            <div className="text-sm text-muted-foreground mt-1">Avg Free Weight</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">${stats.avgFee}/bag</div>
            <div className="text-sm text-muted-foreground mt-1">Avg Fee Rate</div>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-foreground">
              Create New Luggage Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LuggagePolicyForm onClose={() => setShowCreateForm(false)} />
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search policies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
          />
        </div>
      </div>

      {/* Policies Table */}
      <Card className="premium-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-lg text-foreground">
              Your Luggage Policies
            </CardTitle>
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              {filteredPolicies.length} {filteredPolicies.length === 1 ? 'policy' : 'policies'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPolicies.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                {policies?.length === 0 ? 'No luggage policies yet' : 'No policies found'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {policies?.length === 0 
                  ? 'Create your first luggage policy to define allowances and pricing rules for your trips'
                  : 'Try adjusting your search terms'
                }
              </p>
              {policies?.length === 0 && (
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="bg-brand-orange hover:bg-brand-orange-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Policy
                </Button>
              )}
            </div>
          ) : (
            <div className="border-t border-border/40">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="font-semibold text-foreground">Policy</TableHead>
                    <TableHead className="font-semibold text-foreground">Details</TableHead>
                    <TableHead className="font-semibold text-foreground">Rates</TableHead>
                    <TableHead className="font-semibold text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPolicies.map((policy) => (
                    <LuggagePolicyRow 
                      key={policy._id} 
                      policy={policy} 
                      onDelete={handleDeletePolicy}
                      onSetDefault={handleSetDefault}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 