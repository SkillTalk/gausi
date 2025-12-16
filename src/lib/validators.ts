export type ContactFormInput = {
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
};

export type AuditFormInput = {
  name: string;
  email: string;
  website: string;
  goals?: string;
};

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateNonEmpty(value: string) {
  return typeof value === 'string' && value.trim().length > 1;
}

export function validateContact(input: ContactFormInput) {
  const errors: Record<string, string> = {};
  if (!validateNonEmpty(input.name)) errors.name = 'Name is required.';
  if (!validateEmail(input.email)) errors.email = 'Valid email required.';
  if (!validateNonEmpty(input.message)) errors.message = 'Message is required.';
  return errors;
}

export function validateAudit(input: AuditFormInput) {
  const errors: Record<string, string> = {};
  if (!validateNonEmpty(input.name)) errors.name = 'Name is required.';
  if (!validateEmail(input.email)) errors.email = 'Valid email required.';
  if (!validateNonEmpty(input.website)) errors.website = 'Website is required.';
  return errors;
}


