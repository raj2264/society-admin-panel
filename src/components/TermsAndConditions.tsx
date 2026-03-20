import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';

interface TermsAndConditionsProps {
    userType: 'resident' | 'guard' | 'society_admin';
    onAccept: () => void;
    onDecline: () => void;
}

const termsContent = {
    resident: {
        title: "Terms and Conditions for Residents",
        content: `
1. Account Usage
   - You agree to use your MySociety account only for legitimate purposes related to your residence in the society.
   - You are responsible for maintaining the confidentiality of your account credentials.
   - You must notify the society admin immediately of any unauthorized access to your account.

2. Privacy and Data Protection
   - Your personal information will be used only for society-related purposes.
   - We implement appropriate security measures to protect your data.
   - You consent to the collection and processing of your data as described in our Privacy Policy.

3. Community Guidelines
   - You agree to use the platform respectfully and responsibly.
   - You will not use the platform for any illegal or unauthorized purposes.
   - You will not post or share inappropriate content.

4. Communication
   - You agree to receive important notifications via the app.
   - You can opt out of non-essential communications.
   - Emergency communications cannot be opted out of.

5. Access and Security
   - You are responsible for the security of your account.
   - You must use strong passwords and enable 2FA if available.
   - Report any security concerns immediately.

6. Updates to Terms
   - These terms may be updated periodically.
   - You will be notified of significant changes.
   - Continued use of the platform implies acceptance of updated terms.

7. Termination
   - The society admin reserves the right to suspend or terminate access for violations.
   - You can request account deletion by contacting the society admin.
   - Upon termination, your data will be handled according to our data retention policy.
        `
    },
    guard: {
        title: "Terms and Conditions for Guards",
        content: `
1. Professional Conduct
   - You agree to maintain professional conduct while using the MySociety platform.
   - You must verify visitor identities and maintain proper records.
   - You are responsible for the security of your guard account.

2. Data Privacy and Security
   - You will handle resident and visitor data with utmost confidentiality.
   - You must not share or misuse any information accessed through the platform.
   - Report any data breaches or security concerns immediately.

3. Access Control
   - You are authorized to manage visitor access as per society guidelines.
   - You must verify visitor credentials before granting access.
   - Maintain accurate records of all entries and exits.

4. Communication
   - You agree to respond promptly to resident requests.
   - Use the platform's communication features professionally.
   - Report any suspicious activities to the society admin.

5. Account Security
   - You must use strong passwords and enable 2FA if available.
   - Do not share your account credentials with anyone.
   - Log out after each session on shared devices.

6. Updates to Terms
   - These terms may be updated periodically.
   - You will be notified of significant changes.
   - Continued use implies acceptance of updated terms.

7. Termination
   - The society admin can suspend or terminate access for violations.
   - Upon termination, you must return all society property and access devices.
   - Your access will be revoked immediately upon termination.
        `
    },
    society_admin: {
        title: "Terms and Conditions for Society Administrators",
        content: `
1. Administrative Responsibilities
   - You are responsible for managing your society's MySociety platform.
   - You must maintain accurate resident and guard records.
   - You are accountable for all administrative actions taken through your account.

2. Data Management
   - You must handle resident and guard data in compliance with privacy laws.
   - Implement appropriate security measures for data protection.
   - Maintain proper records of all administrative actions.

3. Access Control
   - You are authorized to manage resident and guard accounts.
   - You must verify identities before granting administrative access.
   - Maintain proper documentation of all access changes.

4. Communication
   - You are responsible for official society communications.
   - Use the platform's communication features professionally.
   - Ensure timely response to resident and guard concerns.

5. Security
   - You must use strong passwords and enable 2FA.
   - Do not share your administrative credentials.
   - Monitor and report any suspicious activities.

6. Compliance
   - Ensure society operations comply with applicable laws.
   - Maintain proper records for audit purposes.
   - Implement and enforce society policies fairly.

7. Updates to Terms
   - These terms may be updated periodically.
   - You will be notified of significant changes.
   - Continued use implies acceptance of updated terms.

8. Termination
   - Your access can be revoked for violations of these terms.
   - Upon termination, you must transfer administrative duties properly.
   - All access will be revoked immediately upon termination.
        `
    }
};

export function TermsAndConditions({ userType, onAccept, onDecline }: TermsAndConditionsProps) {
    const [accepted, setAccepted] = useState(false);
    const terms = termsContent[userType];

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-xl font-bold text-center">{terms.title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                    <div className="whitespace-pre-wrap text-sm">
                        {terms.content}
                    </div>
                </ScrollArea>
                <div className="flex items-center space-x-2 mt-4">
                    <Checkbox
                        id="terms"
                        checked={accepted}
                        onCheckedChange={(checked) => setAccepted(checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm">
                        I have read and agree to the terms and conditions
                    </Label>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
                <Button
                    variant="outline"
                    onClick={onDecline}
                >
                    Decline
                </Button>
                <Button
                    onClick={onAccept}
                    disabled={!accepted}
                >
                    Accept
                </Button>
            </CardFooter>
        </Card>
    );
} 