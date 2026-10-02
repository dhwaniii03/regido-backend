import * as schema from '../../../db/schema';

export interface SanitizedUserDto {
  id: number;
  username: string;
  email: string;
  mobileNumber?: string | null;
  city: string;
  postalCode?: string | null;
  countryId: number;
  languageId?: number | null;
  accountType: schema.AccountType;
  status: schema.UserStatus;
  systemRole: schema.SystemRole;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthLoginResponseDto {
  success: boolean;
  message: string;
  user: SanitizedUserDto;
  mustChangePassword: boolean;
  accessToken?: string;
  refreshToken?: string;
  tempToken?: string;
}

export interface ChangePasswordResponseDto {
  success: boolean;
  message: string;
  user: SanitizedUserDto;
  accessToken: string;
  refreshToken: string;
  redirectTo: string;
}

export interface UserWithDetailsDto extends SanitizedUserDto {
  country?: schema.Country | null;
  language?: schema.Language | null;
  subscription?: (schema.UserSubscription & { plan?: schema.Subscription | null }) | null;
  stripeCustomer?: schema.StripeCustomer | null;
  families?: Array<schema.Family & { memberRole: schema.FamilyRole; membershipStatus: schema.MembershipStatus }>;
  companies?: Array<schema.Company & { employeeRole: schema.CompanyRole; membershipStatus: schema.MembershipStatus }>;
  resolvedRoles: string[];
}

export interface UserProfileResponseDto {
  success: boolean;
  user: UserWithDetailsDto;
}
