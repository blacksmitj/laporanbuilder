import { create } from "zustand";

interface ReportEditorState {
  reportId: string | null;
  sectionContents: Record<string, Record<string, unknown>>;
  participantNarratives: Record<string, string>;
  isDirty: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  lastSavedAt: Date | null;

  initEditor: (
    reportId: string,
    initialSections: Record<string, Record<string, unknown>>,
    initialNarratives: Record<string, string>,
  ) => void;

  setSectionContent: (
    sectionKey: string,
    content: Record<string, unknown>,
  ) => void;

  setParticipantNarrative: (
    participantId: string,
    narrative: string,
  ) => void;

  setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
  markSaved: () => void;
  reset: () => void;
}

export const useReportEditorStore = create<ReportEditorState>((set) => ({
  reportId: null,
  sectionContents: {},
  participantNarratives: {},
  isDirty: false,
  saveStatus: "idle",
  lastSavedAt: null,

  initEditor: (reportId, initialSections, initialNarratives) =>
    set({
      reportId,
      sectionContents: initialSections,
      participantNarratives: initialNarratives,
      isDirty: false,
      saveStatus: "idle",
      lastSavedAt: new Date(),
    }),

  setSectionContent: (sectionKey, content) =>
    set((state) => ({
      sectionContents: {
        ...state.sectionContents,
        [sectionKey]: content,
      },
      isDirty: true,
      saveStatus: "idle",
    })),

  setParticipantNarrative: (participantId, narrative) =>
    set((state) => ({
      participantNarratives: {
        ...state.participantNarratives,
        [participantId]: narrative,
      },
      isDirty: true,
      saveStatus: "idle",
    })),

  setSaveStatus: (saveStatus) => set({ saveStatus }),

  markSaved: () =>
    set({
      isDirty: false,
      saveStatus: "saved",
      lastSavedAt: new Date(),
    }),

  reset: () =>
    set({
      reportId: null,
      sectionContents: {},
      participantNarratives: {},
      isDirty: false,
      saveStatus: "idle",
      lastSavedAt: null,
    }),
}));

