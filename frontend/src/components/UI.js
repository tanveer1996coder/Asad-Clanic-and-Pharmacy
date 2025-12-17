import React from 'react';

export const Card = ({ children, title }) => (
  <div className="card">
    {title && <div className="card-header">{title}</div>}
    <div className="card-body">{children}</div>
  </div>
);

export const Field = ({ label, children }) => (
  <div className="field">
    <label className="field-label">{label}</label>
    <div className="field-control">{children}</div>
  </div>
);