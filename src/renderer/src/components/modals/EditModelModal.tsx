import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Model } from '@shared/types/entities';
import { Modal } from '../common/Modal';
import { ModelForm, ModelFormData } from '../forms/ModelForm';

interface EditModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: Model | null;
  onUpdated: (updated: Model) => void;
}

export const EditModelModal: React.FC<EditModelModalProps> = ({
  isOpen,
  onClose,
  model,
  onUpdated,
}) => {
  const { refreshModels, showToast } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!model) return null;

  const handleSubmit = async (data: ModelFormData) => {
    if (!data.provider.trim() || !data.modelName.trim()) {
      showToast('Please provide Provider and Model Name', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (window.electronAPI) {
        const updated = await window.electronAPI.updateModel(model.id, {
          provider: data.provider.trim(),
          modelName: data.modelName.trim(),
          displayName: data.displayName.trim() || `${data.provider.trim()} ${data.modelName.trim()}`,
          modelVersion: data.modelVersion.trim() || undefined,
          modelFamily: data.modelFamily.trim() || undefined,
          parameterCount: data.parameterCount.trim() || undefined,
          architecture: data.architecture.trim() || undefined,
          quantization: data.quantization.trim() || undefined,
          localOrCloud: data.localOrCloud,
          contextWindow: data.contextWindow.trim() || undefined,
          isReasoningModel: data.isReasoningModel,
          aaIntelligenceIndex: data.aaIntelligenceIndex,
          aaEvaluationsJson: data.aaEvaluationsJson,
          aaModelId: data.aaModelId,
          notes: data.notes.trim() || undefined,
        });

        await refreshModels();
        showToast(`Model "${updated.display_name}" updated successfully!`, 'success');
        onUpdated(updated);
        onClose();
      }
    } catch (err: unknown) {
      showToast(`Failed to update model: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Model: ${model.display_name}`}
      subtitle="Update provider, architecture, quantization, context window, and Artificial Analysis benchmark intelligence"
      maxWidth="720px"
    >
      <ModelForm
        initialData={model}
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitLabel="Save Changes"
        isSubmitting={isSubmitting}
      />
    </Modal>
  );
};
