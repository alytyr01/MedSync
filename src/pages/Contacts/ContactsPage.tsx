import { useState } from 'react';
import { Plus, Phone, Trash2, Edit2, Star, Users, HeartPulse } from 'lucide-react';
import {
  useEmergencyContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
} from '@/hooks/useContacts';
import {
  PageHeader,
  Card,
  Modal,
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/common';
import { ContactForm } from '@/components/forms/ContactForm';
import { formatPhone } from '@/utils/format';
import type { ContactFormData } from '@/utils/validation';
import type { EmergencyContact } from '@/types';

export function ContactsPage() {
  const { data: contacts, isLoading, error, refetch } = useEmergencyContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] =
    useState<EmergencyContact | null>(null);
  const [deletingContact, setDeletingContact] =
    useState<EmergencyContact | null>(null);

  const handleAdd = async (data: ContactFormData) => {
    try {
      await createContact.mutateAsync(data);
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add contact:', err);
    }
  };

  const handleUpdate = async (data: ContactFormData) => {
    if (!editingContact) return;
    try {
      await updateContact.mutateAsync({
        id: editingContact.id,
        values: data,
      });
      setEditingContact(null);
    } catch (err) {
      console.error('Failed to update contact:', err);
    }
  };

  const handleDelete = async () => {
    if (!deletingContact) return;
    try {
      await deleteContact.mutateAsync(deletingContact.id);
      setDeletingContact(null);
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
  };

  if (isLoading) return <LoadingState variant="cards" label="Loading contacts..." />;

  if (error) {
    return (
      <ErrorState
        message="Failed to load emergency contacts"
        onRetry={() => refetch()}
      />
    );
  }

  const items = contacts ?? [];
  const primaryContact = items.find((c) => c.is_primary);

  return (
    <div className="px-3">
      <PageHeader
        title="Caregiver"
        subtitle={`${items.length} saved contacts`}
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-light active:scale-95 transition-all duration-200 shadow-button"
            aria-label="Add contact"
          >
            <Plus className="w-5 h-5" strokeWidth={2} />
          </button>
        }
      />

      {/* ===== Primary Caregiver Profile Card ===== */}
      {primaryContact && (
        <div className="premium-card p-6 mb-7">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[16px] bg-pastel-blue flex items-center justify-center shrink-0">
              <span className="text-blue-deep font-bold text-[24px]">
                {primaryContact.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[20px] font-bold text-text tracking-tight">
                  {primaryContact.name}
                </h2>
                <Star className="w-4 h-4 text-warning fill-warning shrink-0" />
              </div>
              <p className="text-[14px] text-secondary mt-0.5">
                {primaryContact.relationship}
              </p>
              <p className="text-[14px] text-secondary">
                {formatPhone(primaryContact.phone)}
              </p>
            </div>
            <button
              onClick={() => handleCall(primaryContact.phone)}
              className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-light active:scale-95 transition-all duration-200 shadow-button shrink-0"
              aria-label={`Call ${primaryContact.name}`}
            >
              <Phone className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Status */}
          <div className="mt-5 flex items-center gap-2 bg-mint-soft rounded-[14px] px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-[13px] font-semibold text-mint-deep">
              Available
            </span>
            <span className="text-[13px] text-mint-deep/70 ml-1">
              Â· Primary caregiver
            </span>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7 text-primary" strokeWidth={2} />}
          title="No emergency contacts"
          description="Add emergency contacts for quick access in case of an emergency."
          action={
            <button
              onClick={() => setShowAddModal(true)}
              className="text-sm text-primary font-medium"
            >
              Add Contact
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* ===== Recent Activity ===== */}
          <div>
            <h2 className="section-title mb-4">Recent Activity</h2>
            <div className="premium-card p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-[12px] bg-mint-soft flex items-center justify-center shrink-0">
                    <HeartPulse className="w-5 h-5 text-mint-deep" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-text">
                      Medication completed
                    </p>
                    <p className="text-[12px] text-secondary mt-0.5">
                      Today Â· 8:00 AM
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-mint-deep bg-mint-soft rounded-full px-3 py-1">
                    On time
                  </span>
                </div>
                <div className="h-px bg-border-subtle" />
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-[12px] bg-rose-soft flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-rose-deep" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-text">
                      Missed reminder
                    </p>
                    <p className="text-[12px] text-secondary mt-0.5">
                      Yesterday Â· 8:00 PM
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-rose-deep bg-rose-soft rounded-full px-3 py-1">
                    Missed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== All Contacts ===== */}
          <div>
            <h2 className="section-title mb-4">All Contacts</h2>
            <div className="space-y-3">
              {items.map((contact) => (
                <div key={contact.id}>
                  <Card className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-blue-soft flex items-center justify-center shrink-0">
                          <span className="text-blue-deep font-semibold text-[17px]">
                            {contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-text text-[15px] truncate">
                              {contact.name}
                            </h3>
                            {contact.is_primary && (
                              <Star className="w-4 h-4 text-warning fill-warning shrink-0" />
                            )}
                          </div>
                          <p className="text-[13px] text-secondary mt-0.5">
                            {contact.relationship}
                          </p>
                          <p className="text-[13px] text-secondary">
                            {formatPhone(contact.phone)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <button
                          onClick={() => handleCall(contact.phone)}
                          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-light active:scale-95 transition-all duration-200 shadow-button"
                          aria-label={`Call ${contact.name}`}
                        >
                          <Phone className="w-[18px] h-[18px]" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => setEditingContact(contact)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-secondary bg-surface-muted hover:bg-border/60 active:scale-95 transition-all duration-200"
                          aria-label={`Edit ${contact.name}`}
                        >
                          <Edit2 className="w-4 h-4" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => setDeletingContact(contact)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-danger bg-rose-soft hover:bg-rose-soft/70 active:scale-95 transition-all duration-200"
                          aria-label={`Delete ${contact.name}`}
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Contact"
      >
        <ContactForm
          onSubmit={handleAdd}
          submitLabel="Add Contact"
          loading={createContact.isPending}
        />
      </Modal>

      {/* Edit Contact Modal */}
      <Modal
        isOpen={editingContact !== null}
        onClose={() => setEditingContact(null)}
        title="Edit Contact"
      >
        {editingContact && (
          <ContactForm
            initialData={editingContact}
            onSubmit={handleUpdate}
            submitLabel="Save Changes"
            loading={updateContact.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingContact !== null}
        onClose={() => setDeletingContact(null)}
        title="Delete Contact"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-text">
              {deletingContact?.name}
            </span>
            ?
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setDeletingContact(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={handleDelete}
              loading={deleteContact.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}