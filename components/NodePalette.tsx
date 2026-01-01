"use client";

import { v4 as uuidv4 } from "uuid";
import { useFlowStore } from "../store/flowStore";

function IconPrompt() {
  return (
    <svg
      className="w-6 h-6 text-white"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" fill="currentColor" />
      <path
        d="M7 16h10v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function IconAction() {
  return (
    <svg
      className="w-6 h-6 text-white"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="8" r="3" fill="currentColor" />
      <path
        d="M5 20c1.5-4 6-6 7-6s5.5 2 7 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NodePalette() {
  const { addNode, rfInstance } = useFlowStore();

  // Return a position centered in the current viewport
  const getCenteredPosition = () => {
    if (rfInstance) {
        // Center of the flow canvas area on screen
        // Sidebar is 256px wide (w-64)
        // Canvas Center X = 256 + (window.innerWidth - 256) / 2
        // Canvas Center Y = window.innerHeight / 2
        const centerX = 256 + (window.innerWidth - 256) / 2;
        const centerY = window.innerHeight / 2;

        const position = rfInstance.project({ 
            x: centerX, 
            y: centerY 
        });

        // Add small random offset so multiple nodes don't stack exactly
        return {
            x: position.x + (Math.random() * 40 - 20),
            y: position.y + (Math.random() * 40 - 20)
        };
    }

    // Fallback: random range around origin
    const x = Math.floor(Math.random() * 800) - 400; 
    const y = Math.floor(Math.random() * 600) - 300; 
    return { x, y };
  };

  return (
    <aside className="p-4 space-y-4 bg-gradient-to-b from-white/60 to-white/30 rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-gray-800">
            Node Palette
          </h2>
          <p className="text-sm text-gray-500">
            Drag or add nodes to build your flow
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center justify-between p-3 bg-indigo-600 rounded-lg shadow hover:shadow-lg transform hover:-translate-y-0.5 transition">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-700 rounded-md">
              <IconPrompt />
            </div>
            <div>
              <div className="text-white font-semibold">Prompt Node</div>
              <div className="text-indigo-100 text-xs">
                Collect user input with customizable message
              </div>
            </div>
          </div>
          <button
            className="ml-4 bg-white/90 text-indigo-700 font-medium rounded-md px-3 py-1 hover:bg-white"
            onClick={() =>
              addNode({
                id: uuidv4(),
                type: "prompt",
                position: getCenteredPosition(),
                data: { message: "" },
              })
            }
          >
            Add
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-emerald-600 rounded-lg shadow hover:shadow-lg transform hover:-translate-y-0.5 transition">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700 rounded-md">
              <IconAction />
            </div>
            <div>
              <div className="text-white font-semibold">Action Node</div>
              <div className="text-emerald-100 text-xs">
                Trigger API calls or side-effects
              </div>
            </div>
          </div>
          <button
            className="ml-4 bg-white/90 text-emerald-700 font-medium rounded-md px-3 py-1 hover:bg-white"
            onClick={() =>
              addNode({
                id: uuidv4(),
                type: "action",
                position: getCenteredPosition(),
                data: { endpoint: "" },
              })
            }
          >
            Add
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-blue-500 rounded-lg shadow hover:shadow-lg transform hover:-translate-y-0.5 transition">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-white font-semibold">Start Node</div>
              <div className="text-blue-100 text-xs">
                Entry point for the flow
              </div>
            </div>
          </div>
          <button
            className="ml-4 bg-white/90 text-blue-600 font-medium rounded-md px-3 py-1 hover:bg-white"
            onClick={() =>
              addNode({
                id: uuidv4(),
                type: "start",
                position: getCenteredPosition(),
                data: { flowName: "", entryNode: "" },
              })
            }
          >
            Add
          </button>
        </div>
      </div>
    </aside>
  );
}
