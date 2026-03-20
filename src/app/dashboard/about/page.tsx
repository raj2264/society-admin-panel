"use client";

import React from 'react';
import { Building, Shield, Users, Zap, RefreshCw, Mail, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

export default function AboutUs() {
  const { theme } = useTheme();

  const features = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Secure & Private',
      description: 'Your society data is encrypted and protected with enterprise-grade security measures.'
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Community First',
      description: 'Built to strengthen community bonds and make society management more efficient.'
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Modern & Fast',
      description: 'Experience a seamless, modern interface designed for the best user experience.'
    },
    {
      icon: <RefreshCw className="h-6 w-6" />,
      title: 'Always Updated',
      description: 'Regular updates and improvements to keep your society management up to date.'
    }
  ];

  const handleEmailClick = () => {
    window.location.href = 'mailto:support@mysocietydetails.com';
  };

  const handlePhoneClick = () => {
    window.location.href = 'tel:+15551234567';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
          <Building className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">MySocietyDetails</h1>
        <p className="text-xl text-muted-foreground mb-2">
          Making Society Management Better
        </p>
        <p className="text-sm text-muted-foreground/70">
          Version 1.0.0
        </p>
      </div>

      {/* Mission Section */}
      <Card className="p-8 mb-12">
        <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
        <p className="text-muted-foreground leading-relaxed">
          MySocietyDetails is dedicated to transforming the way societies are managed. 
          We believe in creating a seamless, secure, and efficient platform that brings communities 
          closer together while simplifying everyday society management tasks for administrators.
        </p>
      </Card>

      {/* Features Grid */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Why Choose MySocietyDetails?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <Card className="p-8">
        <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
        <p className="text-muted-foreground mb-6">
          Have questions or suggestions? We'd love to hear from you!
        </p>
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-4 px-6"
            onClick={handleEmailClick}
          >
            <Mail className="h-5 w-5 text-primary" />
            <span className="text-primary">support@mysocietydetails.com</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-4 px-6"
            onClick={handlePhoneClick}
          >
            <Phone className="h-5 w-5 text-primary" />
            <span className="text-primary">+1 (555) 123-4567</span>
          </Button>
        </div>
      </Card>
    </div>
  );
} 