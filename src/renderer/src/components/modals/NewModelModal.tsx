import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { ModelForm, ModelFormData } from '../forms/ModelForm';

export const NewModelModal: React.FC = () => {
  const {
    isNewModelModalOpen,
    setIsNewModelModalOpen,
    showToast,
    refreshModels,
    setSelectedModelId,
  } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: ModelFormData) => {
    if (!data.provider.trim() || !data.modelName.trim()) {
      showToast('Please provide Provider and Model Name', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (window.electronAPI) {
        const created = await window.electronAPI.createModel({
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
        setSelectedModelId(created.id);
        showToast(`Model "${created.display_name}" registered successfully!`, 'success');
        setIsNewModelModalOpen(false);
      }
    } catch (err: unknown) {
      showToast(`Failed to register model: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isNewModelModalOpen}
      onClose={() => setIsNewModelModalOpen(false)}
      title="Register New Model"
      subtitle="Track benchmarks across specific model releases, parameter scales, and quantizations"
      maxWidth="720px"
    >
      <ModelForm
        onSubmit={handleSubmit}
        onCancel={() => setIsNewModelModalOpen(false)}
        submitLabel="Register Model"
        isSubmitting={isSubmitting}
      />
    </Modal>
  );
};
