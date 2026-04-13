export const USERS = ['Derek', 'Chad'] as const;
export type UserName = (typeof USERS)[number];

export function isValidUser(name: string): name is UserName {
  return USERS.includes(name as UserName);
}
