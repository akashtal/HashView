"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Mail, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Contact {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  replied: boolean;
  createdAt: string;
}

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/contact");
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string, read: boolean) => {
    try {
      const response = await fetch(`/api/contact/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });

      if (!response.ok) throw new Error("Failed to update contact");

      fetchContacts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      const response = await fetch(`/api/contact/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete contact");

      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });

      fetchContacts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const unreadCount = contacts.filter((c) => !c.read).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contact Messages</h1>
        <p className="text-muted-foreground">
          {unreadCount > 0 && (
            <span className="text-hashview-orange font-semibold">{unreadCount} unread</span>
          )}
        </p>
      </div>

      <div className="space-y-4">
        {contacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No contact messages yet</p>
            </CardContent>
          </Card>
        ) : (
          contacts.map((contact) => (
            <Card key={contact._id} className={!contact.read ? "border-hashview-orange/50" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{contact.subject}</CardTitle>
                      {!contact.read && (
                        <span className="text-xs bg-hashview-orange/20 text-hashview-orange px-2 py-1 rounded">
                          New
                        </span>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      <span className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {contact.name} ({contact.email})
                      </span>
                    </CardDescription>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(contact.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!contact.read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkRead(contact._id, true)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Mark Read
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(contact._id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{contact.message}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

