import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiPhone, FiTrash2, FiEdit2, FiStar } from 'react-icons/fi';
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

  return (
    <div className="px-5">
      <PageHeader
        title="Emergency Contacts"
        subtitle={`${items.length} saved contacts`}
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark active:scale-95 transition-all duration-200 shadow-[0_2px_10px_rgba(46,122,88,0.25)]"
            aria-label="Add contact"
          >
            <FiPlus className="w-5 h-5" />
          </button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
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
        <div className="space-y-3">
          {items.map((contact, index) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold text-[17px]">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-text text-[15px] truncate">
                          {contact.name}
                        </h3>
                        {contact.is_primary && (
                          <FiStar className="w-4 h-4 text-warning fill-warning shrink-0" />
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
                      className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark active:scale-95 transition-all duration-200 shadow-[0_2px_8px_rgba(46,122,88,0.15)]"
                      aria-label={`Call ${contact.name}`}
                    >
                      <FiPhone className="w-[18px] h-[18px]" />
                    </button>
                    <button
                      onClick={() => setEditingContact(contact)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-secondary bg-surface-muted hover:bg-border/60 active:scale-95 transition-all duration-200"
                      aria-label={`Edit ${contact.name}`}
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingContact(contact)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-danger bg-danger/5 hover:bg-danger/10 active:scale-95 transition-all duration-200"
                      aria-label={`Delete ${contact.name}`}
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
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