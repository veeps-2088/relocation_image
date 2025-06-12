// Address Type
// todo: change this type to move locale type and create a parsed addresss type

export interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    unit_number?: string; // optional
  };

export interface  MoveLocale{
  address: Address;
  apartment_number?: string;  // optional
  floor_number?: number;      // optional
  has_elevator: boolean;
  special_instructions: string;
  access_info: AccessInfo;

}

// Access Information Type
export interface AccessInfo {
  stairs: boolean;
  stairs_floors: number;
  parking_available: boolean;
  parking_distance: 'near' | 'medium' | 'far';
  elevator: boolean;
}

// Services Enum
export const ServicesEnum = [
  'packing',
  'unpacking',
  'disassembly',
  'reassembly',
  'storage',
  'insurance',
  'junk_removal'
] as const;

// Create a type from the enum array
export type ServiceType = typeof ServicesEnum[number];

// Helper type for selected services
export type SelectedServices = {
  [key in ServiceType]?: boolean;
}

// You might also want a combined type for a complete move request
// export interface MoveRequest {
//   origin_address: Address;
//   destination_address: Address;
//   access_info: AccessInfo;
//   selected_services: SelectedServices;
//   // Add any additional fields needed for the move request
//   request_date: Date;
//   preferred_move_date?: Date;
//   status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
// } 