import React, { Suspense } from "react";
import BookClient from "./BookClient";

export const dynamic = "force-dynamic";

export default function BookPage() {
  return (
    <>
      <BookClient />
    </>
  );
}
