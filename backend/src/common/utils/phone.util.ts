// Nigerian phone number validation and formatting utility

export const NETWORK_PREFIXES = {
  MTN: ['0803', '0806', '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916'],
  AIRTEL: ['0701', '0708', '0802', '0808', '0812', '0901', '0902', '0907', '0912'],
  GLO: ['0705', '0805', '0807', '0811', '0815', '0905', '0915'],
  NINE_MOBILE: ['0809', '0817', '0818', '0908', '0909'],
};

export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');
  
  // Handle +234 prefix
  if (normalized.startsWith('234')) {
    normalized = '0' + normalized.slice(3);
  }
  
  // Ensure it starts with 0
  if (!normalized.startsWith('0') && normalized.length === 10) {
    normalized = '0' + normalized;
  }
  
  return normalized;
}

export function isValidNigerianPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  
  // Nigerian phone numbers should be 11 digits starting with 0
  if (normalized.length !== 11 || !normalized.startsWith('0')) {
    return false;
  }
  
  // Check if the prefix is valid for any network
  const allPrefixes = Object.values(NETWORK_PREFIXES).flat();
  const prefix = normalized.slice(0, 4);
  
  return allPrefixes.includes(prefix);
}

export function detectNetwork(phone: string): string | null {
  const normalized = normalizePhoneNumber(phone);
  const prefix = normalized.slice(0, 4);
  
  for (const [network, prefixes] of Object.entries(NETWORK_PREFIXES)) {
    if (prefixes.includes(prefix)) {
      return network;
    }
  }
  
  return null;
}

export function parsePhoneNumbers(input: string): string[] {
  // Split by comma, newline, or semicolon
  const phones = input.split(/[,\n;]+/).map(p => p.trim()).filter(Boolean);
  return phones.map(normalizePhoneNumber);
}
