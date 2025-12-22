import { supabase } from '../lib/supabase';

export interface Invitation {
  id: string;
  code: string;
  type: 'ranch_creation' | 'ranch_member';
  license_key_id: string | null;
  ranch_id: string | null;
  role: string | null;
  restricted_email: string | null;
  expires_at: string;
  used_at: string | null;
  used_by_user_id: string | null;
  created_by_user_id: string;
  created_at: string;
}

export interface LicenseKey {
  id: string;
  key: string;
  license_type: string;
  expiration_date: string;
  used_by_ranch_id: string | null;
  max_animals: number;
}

export function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createRanchCreationInvitation(
  licenseKeyId: string,
  restrictedEmail: string | null,
  expiresInDays: number = 7
): Promise<{ invitation: Invitation | null; error: Error | null }> {
  try {
    const code = generateInvitationCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        code,
        type: 'ranch_creation',
        license_key_id: licenseKeyId,
        restricted_email: restrictedEmail,
        expires_at: expiresAt.toISOString(),
        created_by_user_id: currentUser.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return { invitation: data, error: null };
  } catch (error) {
    console.error('Error creating ranch creation invitation:', error);
    return { invitation: null, error: error as Error };
  }
}

export async function createRanchMemberInvitation(
  ranchId: string,
  role: string,
  restrictedEmail: string | null,
  expiresInDays: number = 7
): Promise<{ invitation: Invitation | null; error: Error | null }> {
  try {
    const code = generateInvitationCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        code,
        type: 'ranch_member',
        ranch_id: ranchId,
        role,
        restricted_email: restrictedEmail,
        expires_at: expiresAt.toISOString(),
        created_by_user_id: currentUser.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return { invitation: data, error: null };
  } catch (error) {
    console.error('Error creating ranch member invitation:', error);
    return { invitation: null, error: error as Error };
  }
}

export async function validateInvitationCode(
  code: string
): Promise<{ invitation: Invitation | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { invitation: null, error: 'Invalid invitation code' };
    }

    if (data.used_at) {
      return { invitation: null, error: 'This invitation has already been used' };
    }

    if (new Date(data.expires_at) < new Date()) {
      return { invitation: null, error: 'This invitation has expired' };
    }

    const { data: currentUser } = await supabase.auth.getUser();
    if (currentUser.user && data.restricted_email) {
      if (currentUser.user.email !== data.restricted_email) {
        return {
          invitation: null,
          error: `This invitation is restricted to ${data.restricted_email}`,
        };
      }
    }

    return { invitation: data, error: null };
  } catch (error) {
    console.error('Error validating invitation:', error);
    return { invitation: null, error: 'Failed to validate invitation code' };
  }
}

export async function redeemRanchCreationInvitation(
  invitationId: string,
  userId: string,
  ranchName: string,
  ranchLocation: string | null
): Promise<{ ranchId: string | null; error: Error | null }> {
  try {
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*, license_keys(*)')
      .eq('id', invitationId)
      .single();

    if (inviteError) throw inviteError;
    if (!invitation) throw new Error('Invitation not found');

    const licenseKey = (invitation as any).license_keys;
    if (!licenseKey) throw new Error('License key not found');

    const { data: ranch, error: ranchError } = await supabase
      .from('ranches')
      .insert({
        name: ranchName,
        location: ranchLocation,
        active_license_key: licenseKey.key,
        license_type: licenseKey.license_type,
        license_expiration: licenseKey.expiration_date,
        license_activated_at: new Date().toISOString(),
        max_animals: licenseKey.max_animals,
      })
      .select()
      .single();

    if (ranchError) throw ranchError;

    await supabase
      .from('license_keys')
      .update({ used_by_ranch_id: ranch.id })
      .eq('id', licenseKey.id);

    await supabase
      .from('invitations')
      .update({
        used_at: new Date().toISOString(),
        used_by_user_id: userId,
      })
      .eq('id', invitationId);

    return { ranchId: ranch.id, error: null };
  } catch (error) {
    console.error('Error redeeming ranch creation invitation:', error);
    return { ranchId: null, error: error as Error };
  }
}

export async function redeemRanchMemberInvitation(
  invitationId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (inviteError) throw inviteError;
    if (!invitation) throw new Error('Invitation not found');

    const { error: memberError } = await supabase.from('user_ranches').insert({
      user_id: userId,
      ranch_id: invitation.ranch_id!,
      role: invitation.role!,
    });

    if (memberError) throw memberError;

    await supabase
      .from('invitations')
      .update({
        used_at: new Date().toISOString(),
        used_by_user_id: userId,
      })
      .eq('id', invitationId);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error redeeming ranch member invitation:', error);
    return { success: false, error: error as Error };
  }
}

export async function getAvailableLicenseKeys(): Promise<LicenseKey[]> {
  try {
    const { data, error } = await supabase
      .from('license_keys')
      .select('*')
      .is('used_by_ranch_id', null)
      .gt('expiration_date', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching available license keys:', error);
    return [];
  }
}

export async function getRanchInvitations(ranchId: string): Promise<Invitation[]> {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('ranch_id', ranchId)
      .eq('type', 'ranch_member')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching ranch invitations:', error);
    return [];
  }
}

export async function deleteInvitation(invitationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return false;
  }
}
