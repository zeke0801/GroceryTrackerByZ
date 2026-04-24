import React from 'react';
import './App.css';
import { FiMoon, FiSun, FiTrash2, FiDownload, FiList, FiPlus, FiCheck, FiTrendingUp } from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';

const makeTrip = () => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  name: `Trip ${new Date().toLocaleDateString()}`,
  createdAt: new Date().toISOString(),
  items: [],
  budget: 0,
});

function App() {
  const [darkMode, setDarkMode] = React.useState(
    localStorage.getItem('darkMode') === 'true'
  );

  const [trips, setTrips] = React.useState(() => {
    const raw = localStorage.getItem('trips');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { /* fall through to migration */ }
    }

    // Migration from v1: flat `expenses` + global `budget`.
    // Keep this initializer pure — StrictMode calls it twice in dev, and
    // mutating localStorage here would race with the second invocation.
    // Cleanup of old keys happens in a useEffect below.
    const oldRaw = localStorage.getItem('expenses');
    if (oldRaw) {
      try {
        const oldItems = JSON.parse(oldRaw);
        if (Array.isArray(oldItems)) {
          const oldBudget = parseFloat(localStorage.getItem('budget') || '0');
          const trip = makeTrip();
          trip.items = oldItems.map(i => ({ ...i, checked: false }));
          trip.budget = isNaN(oldBudget) ? 0 : oldBudget;
          return [trip];
        }
      } catch (e) { /* fall through */ }
    }

    return [makeTrip()];
  });

  const [activeTripId, setActiveTripId] = React.useState(() => {
    const saved = localStorage.getItem('activeTripId');
    return saved ? Number(saved) : null;
  });

  const [currentAmount, setCurrentAmount] = React.useState('0');
  const [showQR, setShowQR] = React.useState(false);
  const [showTrips, setShowTrips] = React.useState(false);
  const [showTrajectory, setShowTrajectory] = React.useState(false);
  const [deleteItemId, setDeleteItemId] = React.useState(null);
  const [deleteTripId, setDeleteTripId] = React.useState(null);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);

  const [trajectory, setTrajectory] = React.useState(() => {
    try {
      const raw = localStorage.getItem('trajectory');
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) { /* fall through */ }
    return [];
  });

  const addTrajectoryItem = ({ name, unitPrice, quantity }) => {
    setTrajectory(prev => [...prev, {
      id: Date.now(),
      name: name || 'Item',
      unitPrice,
      quantity: parseInt(quantity) || 1,
    }]);
  };

  const removeTrajectoryItem = (id) => {
    setTrajectory(prev => prev.filter(i => i.id !== id));
  };

  const updateTrajectoryItemQty = (id, qty) => {
    setTrajectory(prev => prev.map(i => (i.id === id ? { ...i, quantity: Math.max(1, qty) } : i)));
  };

  const clearTrajectory = () => setTrajectory([]);

  React.useEffect(() => {
    localStorage.setItem('trajectory', JSON.stringify(trajectory));
  }, [trajectory]);

  const effectiveActiveTripId = React.useMemo(() => {
    if (activeTripId && trips.some(t => t.id === activeTripId)) return activeTripId;
    return trips[0]?.id ?? null;
  }, [activeTripId, trips]);

  const activeTrip = trips.find(t => t.id === effectiveActiveTripId) || trips[0];

  const updateActiveTrip = (updater) => {
    setTrips(prev => prev.map(t => (t.id === activeTrip.id ? updater(t) : t)));
  };

  const addExpense = ({ name, unitPrice, quantity }) => {
    const qty = parseInt(quantity) || 1;
    const newItem = {
      id: Date.now(),
      name: name || 'Item',
      quantity: String(qty),
      amount: unitPrice * qty,
      date: new Date().toLocaleDateString(),
      checked: false,
    };
    updateActiveTrip(t => ({ ...t, items: [...t.items, newItem] }));
  };

  const toggleItemChecked = (itemId) => {
    updateActiveTrip(t => ({
      ...t,
      items: t.items.map(i => (i.id === itemId ? { ...i, checked: !i.checked } : i)),
    }));
  };

  const handleDeleteClick = (id) => setDeleteItemId(id);

  const confirmDelete = () => {
    if (deleteItemId !== null) {
      updateActiveTrip(t => ({
        ...t,
        items: t.items.filter(i => i.id !== deleteItemId),
      }));
      setDeleteItemId(null);
    }
  };

  const cancelDelete = () => setDeleteItemId(null);

  const setBudget = (budget) => updateActiveTrip(t => ({ ...t, budget }));

  const totalExpenses = activeTrip.items.reduce((sum, i) => sum + i.amount, 0).toFixed(2);

  const toggleTheme = () => setDarkMode(!darkMode);

  const handleReset = () => setShowResetConfirm(true);

  const confirmReset = () => {
    updateActiveTrip(t => ({ ...t, items: [] }));
    setShowResetConfirm(false);
  };

  const handleCreateTrip = () => {
    const inheritBudget = activeTrip?.budget ?? 0;
    const trip = makeTrip();
    trip.budget = inheritBudget;
    setTrips(prev => [...prev, trip]);
    setActiveTripId(trip.id);
    setShowTrips(false);
  };

  const handleSwitchTrip = (tripId) => {
    setActiveTripId(tripId);
    setShowTrips(false);
  };

  const handleRenameTrip = (tripId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTrips(prev => prev.map(t => (t.id === tripId ? { ...t, name: trimmed } : t)));
  };

  const confirmDeleteTrip = () => {
    if (deleteTripId === null) return;
    const wasActive = deleteTripId === effectiveActiveTripId;
    setTrips(prev => {
      const filtered = prev.filter(t => t.id !== deleteTripId);
      return filtered.length === 0 ? [makeTrip()] : filtered;
    });
    if (wasActive) setActiveTripId(null);
    setDeleteTripId(null);
  };

  React.useEffect(() => {
    localStorage.setItem('trips', JSON.stringify(trips));
  }, [trips]);

  React.useEffect(() => {
    localStorage.removeItem('expenses');
    localStorage.removeItem('budget');
  }, []);

  React.useEffect(() => {
    if (effectiveActiveTripId !== null) {
      localStorage.setItem('activeTripId', String(effectiveActiveTripId));
    }
  }, [effectiveActiveTripId]);

  React.useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    document.documentElement.style.backgroundColor = darkMode ? '#000000' : '#ffffff';
    document.body.className = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  // Deduped item history across all trips for autocomplete.
  // Keyed by lowercase name; keeps the most recently purchased variant's display name + unit price.
  const itemHistory = React.useMemo(() => {
    const seen = new Map();
    for (const trip of trips) {
      for (const i of trip.items) {
        const key = (i.name || '').trim().toLowerCase();
        if (!key) continue;
        const qty = parseFloat(i.quantity) || 1;
        const unitPrice = i.amount / qty;
        const existing = seen.get(key);
        if (!existing || existing.lastSeen < i.id) {
          seen.set(key, { name: i.name, unitPrice, lastSeen: i.id });
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.lastSeen - a.lastSeen);
  }, [trips]);

  const trajectoryTotal = React.useMemo(
    () => trajectory.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [trajectory]
  );

  return (
    <div className={`App ${darkMode ? 'dark' : 'light'}`}>
      {deleteItemId !== null && (
        <div className="delete-modal-overlay" onClick={cancelDelete}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Item</h3>
            <p>Are you sure you want to delete this item?</p>
            <div className="delete-modal-buttons">
              <button className="cancel-btn" onClick={cancelDelete}>Cancel</button>
              <button className="confirm-btn" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {deleteTripId !== null && (
        <div className="delete-modal-overlay" onClick={() => setDeleteTripId(null)}>
          <div className="delete-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Trip</h3>
            <p>This will permanently remove the trip and all its items.</p>
            <div className="delete-modal-buttons">
              <button className="cancel-btn" onClick={() => setDeleteTripId(null)}>Cancel</button>
              <button className="confirm-btn" onClick={confirmDeleteTrip}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <header className="app-header">
        <div className="header-left">
          <div className="qr-section">
            <button onClick={() => setShowQR(!showQR)} className="qr-toggle">QR</button>
            {showQR && (
              <div className="qr-overlay" onClick={() => setShowQR(false)}>
                <div className="qr-popup" onClick={e => e.stopPropagation()}>
                  <button className="qr-close" onClick={() => setShowQR(false)}>Close</button>
                  <QRCodeSVG
                    value={window.location.href}
                    size={200}
                    bgColor={darkMode ? "#1c1c1e" : "#ffffff"}
                    fgColor={darkMode ? "#ffffff" : "#000000"}
                    level="L"
                    includeMargin={false}
                  />
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setShowTrips(true)} className="trips-toggle" aria-label="Trips">
            <FiList />
            <span>Trips</span>
          </button>

          <button onClick={() => setShowTrajectory(true)} className="trajectory-toggle" aria-label="Trajectory">
            <FiTrendingUp />
            <span>Trajectory</span>
          </button>
        </div>

        <div className="theme-toggle">
          <FiMoon className="moon-icon" />
          <label className="switch">
            <input type="checkbox" checked={!darkMode} onChange={toggleTheme} />
            <span className="slider round"></span>
          </label>
          <FiSun className="sun-icon" />
        </div>
      </header>

      {showTrajectory && (
        <TrajectoryModal
          trajectory={trajectory}
          total={trajectoryTotal}
          budget={activeTrip?.budget ?? 0}
          itemHistory={itemHistory}
          onAdd={addTrajectoryItem}
          onRemove={removeTrajectoryItem}
          onUpdateQty={updateTrajectoryItemQty}
          onClear={clearTrajectory}
          onClose={() => setShowTrajectory(false)}
        />
      )}

      {showTrips && (
        <div className="qr-overlay" onClick={() => setShowTrips(false)}>
          <div className="trips-popup" onClick={e => e.stopPropagation()}>
            <div className="trips-header">
              <h3>Trips</h3>
              <button className="new-trip-btn" onClick={handleCreateTrip}>
                <FiPlus /> New Trip
              </button>
            </div>
            <div className="trips-list">
              {[...trips].reverse().map(trip => {
                const total = trip.items.reduce((s, i) => s + i.amount, 0);
                const isActive = trip.id === activeTrip.id;
                return (
                  <div
                    key={trip.id}
                    className={`trip-list-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSwitchTrip(trip.id)}
                  >
                    <div className="trip-list-info">
                      <span className="trip-list-name">
                        {isActive && <FiCheck className="trip-active-check" />}
                        {trip.name}
                      </span>
                      <span className="trip-list-meta">
                        {trip.items.length} item{trip.items.length !== 1 ? 's' : ''} · ₱{total.toFixed(2)}
                      </span>
                    </div>
                    <button
                      className="trip-delete-btn"
                      onClick={(e) => { e.stopPropagation(); setDeleteTripId(trip.id); }}
                      aria-label="Delete trip"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="qr-close" onClick={() => setShowTrips(false)}>Close</button>
          </div>
        </div>
      )}

      <div className="app-container">
        <div style={{ display: 'none' }}>
          <Calculator
            onResult={(amount) => setCurrentAmount(amount)}
            currentAmount={currentAmount}
          />
        </div>
        <ExpenseTracker
          trip={activeTrip}
          currentAmount={currentAmount}
          onAddExpense={addExpense}
          onDeleteExpense={handleDeleteClick}
          onToggleChecked={toggleItemChecked}
          totalExpenses={totalExpenses}
          onReset={handleReset}
          onBudgetChange={setBudget}
          onRenameTrip={(name) => handleRenameTrip(activeTrip.id, name)}
          itemHistory={itemHistory}
        />
      </div>
      <footer className="app-footer">
        Made By Zeke B 2024
      </footer>
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Are you sure you want to remove all items?</p>
            <div className="modal-buttons">
              <button onClick={() => setShowResetConfirm(false)}>Cancel</button>
              <button onClick={confirmReset} className="delete-btn">Reset All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ItemInputForm = ({ itemHistory = [], onSubmit, submitLabel = 'Record Item' }) => {
  const [itemName, setItemName] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [amount, setAmount] = React.useState('1');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = React.useState(-1);

  const suggestionMatches = React.useMemo(() => {
    const q = itemName.trim().toLowerCase();
    if (!q) return [];
    return itemHistory
      .filter(h => {
        const n = h.name.toLowerCase();
        return n.includes(q) && n !== q;
      })
      .slice(0, 6);
  }, [itemName, itemHistory]);

  const pickSuggestion = (s) => {
    setItemName(s.name);
    setPrice(s.unitPrice.toFixed(2));
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!price || !itemName.trim()) return;
    onSubmit({
      name: itemName.trim(),
      unitPrice: parseFloat(price),
      quantity: parseInt(amount) || 1,
    });
    setItemName('');
    setPrice('');
    setAmount('1');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="expense-input-grid">
        <div className="item-input-wrapper">
          <input
            type="text"
            value={itemName}
            onChange={(e) => {
              setItemName(e.target.value);
              setShowSuggestions(true);
              setSelectedSuggestion(-1);
            }}
            onFocus={() => { if (itemName.trim()) setShowSuggestions(true); }}
            onBlur={() => setShowSuggestions(false)}
            onKeyDown={(e) => {
              if (!showSuggestions || suggestionMatches.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestion(prev => Math.min(prev + 1, suggestionMatches.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestion(prev => Math.max(prev - 1, -1));
              } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
                e.preventDefault();
                pickSuggestion(suggestionMatches[selectedSuggestion]);
              } else if (e.key === 'Tab') {
                e.preventDefault();
                pickSuggestion(suggestionMatches[Math.max(0, selectedSuggestion)]);
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
                setSelectedSuggestion(-1);
              }
            }}
            placeholder="Item"
            className="item-input"
            autoComplete="off"
          />
          {showSuggestions && suggestionMatches.length > 0 && (
            <ul className="suggestions-list" role="listbox">
              {suggestionMatches.map((s, idx) => (
                <li
                  key={s.name}
                  role="option"
                  aria-selected={idx === selectedSuggestion}
                  className={`suggestion-item ${idx === selectedSuggestion ? 'selected' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
                  onMouseEnter={() => setSelectedSuggestion(idx)}
                >
                  <span className="suggestion-name">{s.name}</span>
                  <span className="suggestion-price">₱{s.unitPrice.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          type="number"
          inputMode="decimal"
          pattern="[0-9]*"
          value={price}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
              setPrice(value);
            }
          }}
          onKeyDown={(e) => {
            if (!/[\d.]/.test(e.key) &&
                !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
              e.preventDefault();
            }
          }}
          placeholder="Price"
          className="price-input"
          step="0.01"
          min="0"
        />
        <div className="amount-input-container">
          <button
            type="button"
            className="amount-btn"
            onClick={() => setAmount(Math.max(1, parseInt(amount) - 1).toString())}
          >
            −
          </button>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1).toString())}
            placeholder="Amount"
            className="amount-input"
            min="1"
            step="1"
          />
          <button
            type="button"
            className="amount-btn"
            onClick={() => setAmount((parseInt(amount) + 1).toString())}
          >
            +
          </button>
        </div>
      </div>
      <button type="submit" className="add-expense-btn">{submitLabel}</button>
    </form>
  );
};

const ExpenseTracker = ({ trip, currentAmount, onAddExpense, onDeleteExpense, onToggleChecked, totalExpenses, onReset, onBudgetChange, onRenameTrip, itemHistory = [] }) => {
  const [isEditingBudget, setIsEditingBudget] = React.useState(false);
  const [tempBudget, setTempBudget] = React.useState(trip.budget.toString());
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [tempName, setTempName] = React.useState(trip.name);

  const budget = trip.budget;
  const expenses = trip.items;

  const handleBudgetClick = () => {
    setTempBudget(budget.toString());
    setIsEditingBudget(true);
  };

  const handleBudgetSubmit = () => {
    const newBudget = parseFloat(tempBudget);
    if (!isNaN(newBudget) && newBudget >= 0) {
      onBudgetChange(newBudget);
    }
    setIsEditingBudget(false);
  };

  const handleBudgetKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleBudgetSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingBudget(false);
      setTempBudget(budget.toString());
    }
  };

  const handleNameClick = () => {
    setTempName(trip.name);
    setIsEditingName(true);
  };

  const handleNameSubmit = () => {
    onRenameTrip(tempName);
    setIsEditingName(false);
  };

  const handleNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setTempName(trip.name);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.text(trip.name, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(12);
    const headers = ['Item', 'Price', 'Amount', 'Total'];
    let y = 50;
    const margin = 20;
    const colWidth = (pageWidth - 2 * margin) / 4;

    headers.forEach((header, i) => {
      doc.text(header, margin + (i * colWidth), y);
    });

    y += 10;
    doc.line(margin, y - 5, pageWidth - margin, y - 5);

    doc.setFontSize(10);
    expenses.forEach((expense) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const qty = parseFloat(expense.quantity) || 1;
      const unitPrice = (expense.amount / qty).toFixed(2);
      const prefix = expense.checked ? '[x] ' : '';
      doc.text(prefix + expense.name, margin, y);
      doc.text(`P${unitPrice}`, margin + colWidth, y);
      doc.text(`${expense.quantity}`, margin + 2 * colWidth, y);
      doc.text(`P${expense.amount.toFixed(2)}`, margin + 3 * colWidth, y);
      y += 10;
    });

    y += 5;
    doc.line(margin, y - 5, pageWidth - margin, y - 5);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Expenses: P${totalExpenses}`, pageWidth - (margin + 15), y, { align: 'right' });

    const safeName = trip.name.replace(/[^\w\s-]/g, '').trim() || 'expense-report';
    doc.save(`${safeName}.pdf`);
  };

  const checkedCount = expenses.filter(e => e.checked).length;

  return (
    <div className="note-taker">
      <div className="tracker-header">
        {isEditingName ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyPress}
            className="trip-name-input"
            autoFocus
            maxLength={40}
          />
        ) : (
          <h2 className="trip-name" onClick={handleNameClick} title="Click to rename">
            {trip.name}
          </h2>
        )}
      </div>
      <ItemInputForm itemHistory={itemHistory} onSubmit={onAddExpense} submitLabel="Record Item" />
      <div className="expense-header">
        <span className="header-item">Item</span>
        <span className="header-price">Price</span>
        <span className="header-amount">Amount</span>
        <span className="header-total"></span>
        <span className="header-actions"></span>
      </div>
      <div className="notes-list">
        {[...expenses].reverse().map(expense => (
          <div
            key={expense.id}
            className={`expense-item ${expense.checked ? 'checked' : ''}`}
            onClick={() => onToggleChecked(expense.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleChecked(expense.id);
              }
            }}
            role="button"
            aria-pressed={expense.checked}
            tabIndex={0}
          >
            <div className="expense-details">
              <span className="expense-name">{expense.name}</span>
              <span className="expense-price">₱{(expense.amount / (parseFloat(expense.quantity) || 1)).toFixed(2)}</span>
              <span className="expense-quantity">×{expense.quantity}</span>
              <span className="expense-total">₱{expense.amount.toFixed(2)}</span>
              <button
                className="delete-button"
                onClick={(e) => { e.stopPropagation(); onDeleteExpense(expense.id); }}
                aria-label="Delete item"
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>

      {expenses.length > 0 && (
        <div className="check-progress">
          {checkedCount} of {expenses.length} grabbed
        </div>
      )}

      <div className="expense-grand-total">
        Total Expenses: ₱{totalExpenses}
      </div>
      <div className="budget-section">
        {isEditingBudget ? (
          <div className="budget-edit">
            <input
              type="number"
              inputMode="decimal"
              pattern="[0-9]*"
              value={tempBudget}
              onChange={(e) => setTempBudget(e.target.value)}
              onBlur={handleBudgetSubmit}
              onKeyDown={handleBudgetKeyPress}
              className="budget-input"
              autoFocus
              min="0"
              step="any"
            />
          </div>
        ) : (
          <div className="budget-display" onClick={handleBudgetClick}>
            {budget > 0 ? `Budget: ₱${budget.toFixed(2)}` : 'Click to set limit'}
          </div>
        )}
        <div className={`budget-status ${parseFloat(totalExpenses) > budget ? 'over-budget' : ''}`}>
          {budget > 0 && `${((parseFloat(totalExpenses) / budget) * 100).toFixed(1)}% of budget`}
        </div>
      </div>

      <button onClick={generatePDF} className="export-btn" aria-label="Export to PDF">
          <FiDownload />
          <span>Save Report</span>
        </button>
      <button className="reset-list-btn" onClick={onReset}>
        Reset List
      </button>
    </div>
  );
};

const Calculator = ({ onResult, currentAmount }) => {
  const [value, setValue] = React.useState(currentAmount);
  const [memory, setMemory] = React.useState(null);
  const [operator, setOperator] = React.useState(null);
  const [history, setHistory] = React.useState([]);

  React.useEffect(() => {
    setValue(currentAmount);
  }, [currentAmount]);

  const handleNumber = (num) => {
    if (value === '0') {
      setValue(num.toString());
    } else {
      setValue(value + num);
    }
    onResult(value + num);
  };

  const handleOperator = (op) => {
    setOperator(op);
    setMemory(parseFloat(value));
    setValue('0');
  };

  const handleEqual = () => {
    if (!operator || !memory) return;

    const current = parseFloat(value);
    let result = 0;

    switch (operator) {
      case '+':
        result = memory + current;
        break;
      case '-':
        result = memory - current;
        break;
      case '×':
        result = memory * current;
        break;
      case '÷':
        result = memory / current;
        break;
      default:
        return;
    }

    setHistory(prev => [...prev, `${memory} ${operator} ${current} = ${result}`]);
    setValue(result.toString());
    onResult(result.toString());
    setMemory(null);
    setOperator(null);
  };

  const handleClear = () => {
    setValue('0');
    setMemory(null);
    setOperator(null);
    onResult('0');
  };

  const handlePercent = () => {
    const result = (parseFloat(value) / 100).toString();
    setValue(result);
    onResult(result);
  };

  const handlePlusMinus = () => {
    const result = (parseFloat(value) * -1).toString();
    setValue(result);
    onResult(result);
  };

  return (
    <div className="calculator">
      <div className="display">{value}</div>
      <div className="buttons">
        <button className="gray" onClick={handleClear}>AC</button>
        <button className="gray" onClick={handlePlusMinus}>±</button>
        <button className="gray" onClick={handlePercent}>%</button>
        <button className="orange" onClick={() => handleOperator('÷')}>÷</button>

        <button onClick={() => handleNumber(7)}>7</button>
        <button onClick={() => handleNumber(8)}>8</button>
        <button onClick={() => handleNumber(9)}>9</button>
        <button className="orange" onClick={() => handleOperator('×')}>×</button>

        <button onClick={() => handleNumber(4)}>4</button>
        <button onClick={() => handleNumber(5)}>5</button>
        <button onClick={() => handleNumber(6)}>6</button>
        <button className="orange" onClick={() => handleOperator('-')}>−</button>

        <button onClick={() => handleNumber(1)}>1</button>
        <button onClick={() => handleNumber(2)}>2</button>
        <button onClick={() => handleNumber(3)}>3</button>
        <button className="orange" onClick={() => handleOperator('+')}>+</button>

        <button className="span-2" onClick={() => handleNumber(0)}>0</button>
        <button onClick={() => handleNumber('.')}>.</button>
        <button className="orange" onClick={handleEqual}>=</button>
      </div>
      <div className="history-display">
        <div className="history-label">History</div>
        <div className="history-list">
          {history.map((item, index) => (
            <div key={index} className="history-item">{item}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TrajectoryModal = ({ trajectory, total, budget, itemHistory, onAdd, onRemove, onUpdateQty, onClear, onClose }) => {
  const budgetPct = budget > 0 ? (total / budget) * 100 : 0;

  return (
    <div className="qr-overlay" onClick={onClose}>
      <div className="trajectory-popup" onClick={e => e.stopPropagation()}>
        <div className="trajectory-header">
          <h3>Trajectory</h3>
          {trajectory.length > 0 && (
            <button className="trajectory-clear-btn" onClick={onClear}>Clear</button>
          )}
        </div>

        <ItemInputForm itemHistory={itemHistory} onSubmit={onAdd} submitLabel="Plan Item" />

        {trajectory.length === 0 ? (
          <div className="trajectory-empty">
            <p>Plan items here to save for later.</p>
            <p>They stay put — come back anytime to adjust.</p>
          </div>
        ) : (
          <div className="trajectory-list">
            {trajectory.map(item => (
              <div key={item.id} className="trajectory-item selected">
                <div className="trajectory-item-info">
                  <span className="trajectory-item-name">{item.name}</span>
                  <span className="trajectory-item-price">₱{item.unitPrice.toFixed(2)}</span>
                </div>
                <div className="trajectory-stepper">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label={`Decrease ${item.name}`}
                  >−</button>
                  <span className="trajectory-qty">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                    aria-label={`Increase ${item.name}`}
                  >+</button>
                </div>
                <button
                  type="button"
                  className="trajectory-remove-btn"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        )}

        {trajectory.length > 0 && (
          <div className="trajectory-summary">
            <div className="trajectory-total-row">
              <span className="trajectory-total-label">Projected total</span>
              <span className="trajectory-total-value">₱{total.toFixed(2)}</span>
            </div>
            {budget > 0 && (
              <div className={`trajectory-budget-row ${total > budget ? 'over' : ''}`}>
                <span>
                  {total > budget
                    ? `Over by ₱${(total - budget).toFixed(2)}`
                    : `₱${(budget - total).toFixed(2)} under budget`}
                </span>
                <span>{budgetPct.toFixed(0)}% of ₱{budget.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        <button className="qr-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default App;
