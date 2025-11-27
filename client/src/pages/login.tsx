import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithGoogle, signInWithMicrosoft, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { SiGoogle } from "react-icons/si";
import { Mail, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import brotherhoodFlag from "@assets/flag png_1764277483845.png";

export default function LoginPage() {
  const { user, loading, isConfigured } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google login failed:", error);
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      await signInWithMicrosoft();
    } catch (error) {
      console.error("Microsoft login failed:", error);
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
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConfigured && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Firebase authentication is not configured. Please add the required environment variables.
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            variant="default" 
            className="w-full gap-3"
            onClick={handleGoogleLogin}
            disabled={!isConfigured}
            data-testid="button-google-login"
          >
            <SiGoogle className="h-5 w-5" />
            Sign in with Google
          </Button>
          
          <Button 
            variant="secondary" 
            className="w-full gap-3"
            onClick={handleMicrosoftLogin}
            disabled={!isConfigured}
            data-testid="button-microsoft-login"
          >
            <Mail className="h-5 w-5" />
            Sign in with Outlook
          </Button>

          <p className="text-center text-sm text-muted-foreground pt-4">
            By signing in, you agree to be a respectful member of The Brotherhood community.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
