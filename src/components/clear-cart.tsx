"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cart";

export default function ClearCartOnSuccess() {
  useEffect(() => clearCart(), []);
  return null;
}
