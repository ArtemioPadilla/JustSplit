'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import Button from '../Button';
import styles from './styles.module.css';

interface EntityListProps {
  title: string;
  emptyStateMessage: string;
  createNewButtonText: string;
  createNewPath: string;
  isEmpty: boolean;
  filterControls?: ReactNode;
  children: ReactNode;
}

export default function EntityList({
  title,
  emptyStateMessage,
  createNewButtonText,
  createNewPath,
  isEmpty,
  filterControls,
  children
}: EntityListProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{title}</h1>
      
      {isEmpty ? (
        <div className={styles.emptyState}>
          <p>{emptyStateMessage}</p>
          <Link href={createNewPath}>
            <Button variant="primary">{createNewButtonText}</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.buttonContainer}>
            <Link href={createNewPath}>
              <Button variant="primary">{createNewButtonText}</Button>
            </Link>
          </div>
          
          {filterControls && (
            <div className={styles.filters}>
              {filterControls}
            </div>
          )}
          
          <div className={styles.entityList}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}
