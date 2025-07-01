import React, { useState } from "react";
import { User } from "@/types";

interface RedeemModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onConfirm: (pointsToRedeem: number) => void;
}

export default function RedeemModal({
  isOpen,
  user,
  onClose,
  onConfirm,
}: RedeemModalProps) {
  const [points, setPoints] = useState<number>(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Redeem points</h2>
        <p className="text-sm text-gray-700 mb-1">
          User: <span className="font-semibold">{user.name}</span>
        </p>
        <p className="text-sm text-gray-700 mb-4">
          Current points: <span className="font-semibold">{user.points}</span>
        </p>

        <input
          type="number"
          min={0}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="0"
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(points)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
