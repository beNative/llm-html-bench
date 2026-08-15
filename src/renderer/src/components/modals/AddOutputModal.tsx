import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Model, Prompt, PromptVersion } from '@shared/types/entities';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { RatingInput } from '../common/RatingInput';
import { extractHtml } from '@shared/utils/htmlExtractor';
import { calculateOverallScore } from '@shared/utils/scoreCalculator';
import { MonacoCodeEditor } from '../editor/MonacoCodeEditor';
import {
  Award,
  Plus,
} from 'lucide-react';

export const AddOutputModal: React.FC = () => {
  const {
    isAddOutputModalOpen,
    setIsAddOutputModalOpen,
    activePromptForOutput,
    showToast,
    openCompareWithRuns,
  } = useApp();

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // Generation Metadata
  const [temperature, setTemperature] = useState<string>('0.7');
  const [topP, setTopP] = useState<string>('1.0');
  const [generationTimeMs, setGenerationTimeMs] = useState<string>('');
  const [outputTokens, setOutputTokens] = useState<string>('');
  const [tokensPerSecond, setTokensPerSecond] = useState<string>('');
  const [provenance] = useState<'manual-paste' | 'api'>('manual-paste');
  const [runNotes, setRunNotes] = useState<string>('');

  // Raw Response & Extracted HTML
  const [rawOutput, setRawOutput] = useState<string>('');
  const [extractedHtml, setExtractedHtml] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'raw' | 'html'>('raw');

  // Initial Evaluation Scores
  const [visualScore, setVisualScore] = useState<number | null>(null);
  const [promptAdherenceScore, setPromptAdherenceScore] = useState<number | null>(null);
  const [functionalityScore, setFunctionalityScore] = useState<number | null>(null);
  const [codeQualityScore, setCodeQualityScore] = useState<number | null>(null);
  const [creativityScore, setCreativityScore] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load prompts & models on open
  useEffect(() => {
    if (isAddOutputModalOpen && window.electronAPI) {
      Promise.all([
        window.electronAPI.getPrompts(),
        window.electronAPI.getModels(),
      ]).then(([pList, mList]) => {
        setPrompts(pList);
        setModels(mList);

        const initialPromptId = activePromptForOutput?.promptId || (pList.length > 0 ? pList[0].id : '');
        setSelectedPromptId(initialPromptId);
        if (mList.length > 0) {
          setSelectedModelId(mList[0].id);
        }
      });
    }
  }, [isAddOutputModalOpen, activePromptForOutput]);

  // Load versions when prompt changes
  useEffect(() => {
    if (selectedPromptId && window.electronAPI) {
      window.electronAPI.getPromptVersions(selectedPromptId).then((versions) => {
        setPromptVersions(versions);
        if (versions.length > 0) {
          const target = activePromptForOutput?.versionId || versions[0].id;
          setSelectedVersionId(target);
        }
      });
    }
  }, [selectedPromptId, activePromptForOutput]);

  // Extract HTML automatically when rawOutput changes
  const handleRawOutputChange = (val: string) => {
    setRawOutput(val);
    const html = extractHtml(val);
    setExtractedHtml(html);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromptId || !selectedVersionId) {
      showToast('Please select a prompt and version', 'error');
      return;
    }
    if (!selectedModelId) {
      showToast('Please select a model', 'error');
      return;
    }
    if (!rawOutput.trim()) {
      showToast('Please paste the model raw response or HTML code', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (window.electronAPI) {
        const computedOverall = calculateOverallScore({
          visualScore,
          promptAdherenceScore,
          functionalityScore,
          codeQualityScore,
          creativityScore,
        });

        const run = await window.electronAPI.createModelRun({
          promptVersionId: selectedVersionId,
          modelId: selectedModelId,
          temperature: temperature ? parseFloat(temperature) : undefined,
          topP: topP ? parseFloat(topP) : undefined,
          generationTimeMs: generationTimeMs ? parseInt(generationTimeMs, 10) : undefined,
          outputTokens: outputTokens ? parseInt(outputTokens, 10) : undefined,
          tokensPerSecond: tokensPerSecond ? parseFloat(tokensPerSecond) : undefined,
          rawOutput: rawOutput.trim(),
          html: extractedHtml.trim() || rawOutput.trim(),
          provenance,
          notes: runNotes.trim() || undefined,
          evaluation: computedOverall !== null
            ? {
                visualScore: visualScore ?? undefined,
                promptAdherenceScore: promptAdherenceScore ?? undefined,
                functionalityScore: functionalityScore ?? undefined,
                codeQualityScore: codeQualityScore ?? undefined,
                creativityScore: creativityScore ?? undefined,
                overallScore: computedOverall,
              }
            : undefined,
        });

        showToast('Benchmark run recorded successfully!', 'success');
        setIsAddOutputModalOpen(false);

        // Open in comparison / inspector
        openCompareWithRuns([run.id]);

        // Reset
        setRawOutput('');
        setExtractedHtml('');
        setRunNotes('');
        setVisualScore(null);
        setPromptAdherenceScore(null);
        setFunctionalityScore(null);
        setCodeQualityScore(null);
        setCreativityScore(null);
      }
    } catch (err: unknown) {
      showToast(`Failed to record run: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isAddOutputModalOpen}
      onClose={() => setIsAddOutputModalOpen(false)}
      title="Add Model Benchmark Output"
      subtitle="Submit or paste an HTML application output generated by an LLM"
      maxWidth="880px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Step 1: Prompt & Model Target Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Benchmark Prompt *
            </label>
            <select
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
              }}
            >
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Prompt Version *
            </label>
            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
              }}
            >
              {promptVersions.map((pv) => (
                <option key={pv.id} value={pv.id}>
                  Version {pv.version} {pv.notes ? `(${pv.notes})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Generating Model *
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
              }}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.provider} — {m.display_name} {m.quantization ? `(${m.quantization})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Sampling & Performance Metadata */}
        <div
          style={{
            padding: '10px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
              Temperature
            </label>
            <input
              type="number"
              step="0.05"
              placeholder="0.7"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              style={{ width: '100%', padding: '4px 6px', fontSize: '11px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
              Top P
            </label>
            <input
              type="number"
              step="0.05"
              placeholder="1.0"
              value={topP}
              onChange={(e) => setTopP(e.target.value)}
              style={{ width: '100%', padding: '4px 6px', fontSize: '11px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
              Generation Time (ms)
            </label>
            <input
              type="number"
              placeholder="e.g. 4200"
              value={generationTimeMs}
              onChange={(e) => setGenerationTimeMs(e.target.value)}
              style={{ width: '100%', padding: '4px 6px', fontSize: '11px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
              Output Tokens
            </label>
            <input
              type="number"
              placeholder="e.g. 1850"
              value={outputTokens}
              onChange={(e) => setOutputTokens(e.target.value)}
              style={{ width: '100%', padding: '4px 6px', fontSize: '11px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
              Tokens / Second
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 45.2"
              value={tokensPerSecond}
              onChange={(e) => setTokensPerSecond(e.target.value)}
              style={{ width: '100%', padding: '4px 6px', fontSize: '11px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
        </div>

        {/* Step 3: Raw Output & Extracted HTML Editor */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setActiveSubTab('raw')}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeSubTab === 'raw' ? 'var(--accent-primary-light)' : 'transparent',
                  color: activeSubTab === 'raw' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: activeSubTab === 'raw' ? 600 : 500,
                  fontSize: '11px',
                }}
              >
                Raw LLM Response *
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('html')}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: activeSubTab === 'html' ? 'var(--accent-primary-light)' : 'transparent',
                  color: activeSubTab === 'html' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: activeSubTab === 'html' ? 600 : 500,
                  fontSize: '11px',
                }}
              >
                Extracted HTML Preview ({extractedHtml.length} chars)
              </button>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Non-destructive: The original raw markdown/fences are permanently preserved.
            </span>
          </div>

          <div style={{ height: '220px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {activeSubTab === 'raw' ? (
              <MonacoCodeEditor
                value={rawOutput}
                onChange={handleRawOutputChange}
                language="markdown"
              />
            ) : (
              <MonacoCodeEditor
                value={extractedHtml}
                onChange={setExtractedHtml}
                language="html"
              />
            )}
          </div>
        </div>

        {/* Step 4: Optional Initial Ratings */}
        <div
          style={{
            padding: '10px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Award size={14} color="var(--accent-warning)" />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Initial Evaluation Scores (Optional — can also be scored later in Compare mode)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
            <RatingInput label="Visual" value={visualScore} onChange={setVisualScore} />
            <RatingInput label="Adherence" value={promptAdherenceScore} onChange={setPromptAdherenceScore} />
            <RatingInput label="Functionality" value={functionalityScore} onChange={setFunctionalityScore} />
            <RatingInput label="Code Quality" value={codeQualityScore} onChange={setCodeQualityScore} />
            <RatingInput label="Creativity" value={creativityScore} onChange={setCreativityScore} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <input
            type="text"
            placeholder="Run notes (e.g. tested on RTX 4090, 8k context, quant Q4_K_M)..."
            value={runNotes}
            onChange={(e) => setRunNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
            }}
          />
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <Button type="button" variant="ghost" onClick={() => setIsAddOutputModalOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} icon={<Plus size={14} />}>
            {isSubmitting ? 'Saving Run...' : 'Save Benchmark Output'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
