"use server";

import { createAdminClient } from "@/appwrite";
import { appwriteConfig } from "@/appwrite/config";
import { ID, Query } from "node-appwrite";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    appwriteConfig.databaseId!,
    appwriteConfig.usersCollectionId!,
    [Query.equal("email", [email])]
  );

  return result.total > 0 ? result.documents[0] : null;
};

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();

  try {
    const session = await account.createEmailToken(ID.unique(), email);
    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send email OTP");
  }
};

export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });

  if (!accountId) {
    throw new Error("Failed to create account");
  }

  if (!existingUser) {
    try {
        const {databases} = await createAdminClient();

        await databases.createDocument(
            appwriteConfig.databaseId!,
            appwriteConfig.usersCollectionId!,
            ID.unique(),
            {
                fullName,
                email,
                avatar: "https://t4.ftcdn.net/jpg/09/64/89/17/360_F_964891760_h0DymPvgJ0dZtcdWLts0qQIrk9fKWpjG.jpg",
                accountId
            }
        )
    } catch (error) {
      handleError(error, "Failed to create user");
    }
  }

  return parseStringify({accountId});
};

export const verifySecret = async ({ accountId, password }: { accountId: string; password: string }) => {
  try {
    const {account} = await createAdminClient();

    const session = await account.createSession(accountId, password);

    (await cookies()).set('appwrite-session', session.secret, {
      httpOnly: true,
      sameSite: "strict",
      secure: true
    })

    return parseStringify({sessionId: session.$id});
  } catch (error) {
    handleError(error, "Failed to verify secret");
  }


}
