import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signInWithGoogle, signInWithMicrosoft, signInWithEmail, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { SiGoogle } from "react-icons/si";
import { Mail } from "lucide-react";
import brotherhoodFlag from "@assets/flag png_1764277483845.png";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Redirect will happen automatically when auth state updates
    } catch (error) {
      console.error("Google login failed:", error);
      setGoogleLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setMicrosoftLoading(true);
    try {
      await signInWithMicrosoft();
      // Redirect will happen automatically when auth state updates
    } catch (error) {
      console.error("Microsoft login failed:", error);
      setMicrosoftLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }
    setEmailLoading(true);
    try {
      await signInWithEmail(email);
      setEmailSubmitted(true);
    } catch (error) {
      console.error("Email login failed:", error);
      setEmailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={brotherhoodFlag} 
              alt="The Brotherhood Flag" 
              className="h-24 w-auto"
              data-testid="img-brotherhood-flag"
            />
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-login-title">
            Join The Brotherhood
          </CardTitle>
          <CardDescription data-testid="text-login-description">
            Sign in to access the community forum and chat
          </CardDescription>
          {!isFirebaseConfigured && (
            <p className="text-xs text-muted-foreground">
              (Test mode: Click below to sign in with a test account)
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!emailSubmitted ? (
            <>
              <Button 
                variant="default" 
                className="w-full gap-3"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                data-testid="button-google-login"
              >
                <SiGoogle className="h-5 w-5" />
                {googleLoading ? "Signing in..." : "Sign in with Google"}
              </Button>
              
              <Button 
                variant="secondary" 
                className="w-full gap-3"
                onClick={handleMicrosoftLogin}
                disabled={microsoftLoading}
                data-testid="button-microsoft-login"
              >
                <Mail className="h-5 w-5" />
                {microsoftLoading ? "Signing in..." : "Sign in with Outlook"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

              <div className="space-y-2">
                <Input 
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={emailLoading}
                  onKeyPress={(e) => e.key === "Enter" && handleEmailLogin()}
                  data-testid="input-email"
                />
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={handleEmailLogin}
                  disabled={emailLoading || !email}
                  data-testid="button-email-login"
                >
                  {emailLoading ? "Sending link..." : "Send sign-in link"}
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground pt-2">
                By signing in, you agree to be a respectful member of The Brotherhood community.
              </p>
            </>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="text-lg font-semibold text-foreground">Check your email!</div>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Click the link in your email to continue signing in.
              </p>
              <Button 
                variant="ghost"
                onClick={() => {
                  setEmailSubmitted(false);
                  setEmail("");
                }}
                data-testid="button-back-to-login"
              >
                Back to login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
