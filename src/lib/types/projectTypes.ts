import { MoveLocale } from "./moveTypes";

export interface MoveBidRequest {
  projectId: string;
  clientId: string;
  
  // Move Details
  moveDate: Date;
  originLocale:{ 
    location:MoveLocale;
    is_destination: boolean;
  };
  destinationLocale:{ 
    location:MoveLocale;
    is_destination: boolean;
  };

  
  // Project Specifics
  propertyType: 'house' | 'apartment' | 'office' | 'other'; // todo: review this list
  squareFootage: number; // todo: review if we want this feature    
  numberOfRooms: number; // todo: review if we want this feature
  specialItems?: string[]; // todo: review if we want this feature
  
  // Service Requirements
  services_required: {
    packing: boolean;
    loading: boolean;
    transportation: boolean;
    unloading: boolean;
    unpacking: boolean;
    storage: boolean;
  };
  
  // Additional Information
  specialInstructions?: string;
  preferredContactMethod: 'email' | 'phone'; // todo: update this based on how we connect for bids
  status: 'draft' | 'submitted' | 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface BidResponse {
  bidId: string;
  projectId: string;
  vendorId: string;
  estimatedCost: {
    amount: number;
    currency: string;
  };
  timelineEstimate: {
    startDate: Date;
    endDate: Date;
  };
  services_required: string[];
  terms: string;
  validUntil: Date;
  status: 'pending' | 'accepted' | 'rejected';
} 