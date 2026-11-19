import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { useCreateCinema } from '../../api/queries';
import type { Cinema } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { TextField } from '../../components/ui/Field';
import { BundleChips } from './BundleChips';
import { parseBundleSizes } from './bundle-sizes';
import styles from './CinemaFormDialog.module.css';

export interface CinemaFormDialogProps {
  onClose: () => void;
  onCreated: (cinema: Cinema) => void;
}

export function CinemaFormDialog({ onClose, onCreated }: CinemaFormDialogProps) {
  const [name, setName] = useState('');
  const [sizesText, setSizesText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [nameError, setNameError] = useState<string>();
  const createCinema = useCreateCinema();

  const parsed = parseBundleSizes(sizesText);
  const showSizesError = submitted || sizesText.trim().length > 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const trimmed = name.trim();
    setNameError(trimmed ? undefined : 'Give the cinema a name.');
    if (!trimmed || parsed.error) return;

    try {
      const cinema = await createCinema.mutateAsync({ name: trimmed, bundleSizes: parsed.sizes });
      onCreated(cinema);
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'DUPLICATE_NAME') {
        setNameError(caught.message);
      }
    }
  };

  const otherError =
    createCinema.error instanceof ApiError && createCinema.error.code !== 'DUPLICATE_NAME'
      ? createCinema.error.message
      : undefined;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Add a cinema"
      description="Cinemas sell opening-night seats only in fixed bundles. Groups can buy any number of each."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="cinema-form"
            icon={Plus}
            loading={createCinema.isPending}
          >
            Add cinema
          </Button>
        </>
      }
    >
      <form id="cinema-form" className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={nameError}
          maxLength={200}
          autoFocus
          required
        />
        <TextField
          label="Bundle sizes"
          value={sizesText}
          onChange={(event) => setSizesText(event.target.value)}
          placeholder="2, 5"
          inputMode="numeric"
          error={showSizesError ? parsed.error : undefined}
          hint="Seats per bundle, separated by commas. Up to 10 sizes, 1-500 seats each."
          required
        />
        {parsed.sizes.length > 0 && !parsed.error && (
          <div className={styles.preview}>
            <span className={styles.previewLabel}>Sells bundles of</span>
            <BundleChips sizes={parsed.sizes} />
          </div>
        )}
        {otherError && <Alert reveal>{otherError}</Alert>}
      </form>
    </Dialog>
  );
}
