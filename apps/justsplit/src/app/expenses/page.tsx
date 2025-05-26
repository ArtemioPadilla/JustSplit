'use client';

import React from 'react';
import PageRedirect from '../../components/ui/PageRedirect';

export default function ExpensesPage() {
  return <PageRedirect redirectPath="/expenses/list" title="expenses list" />;
}
