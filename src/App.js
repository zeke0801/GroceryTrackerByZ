import React from 'react';
import './App.css';
import { FiMoon, FiSun, FiTrash2, FiDownload } from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import { MdRefresh } from 'react-icons/md';

function App() {
  const [darkMode, setDarkMode] = React.useState(
    localStorage.getItem('darkMode') === 'true'
  );
  const [expenses, setExpenses] = React.useState(() => {
    const savedExpenses = localStorage.getItem('expenses');
    return savedExpenses ? JSON.parse(savedExpenses) : [];
  });
  const [budget, setBudget] = React.useState(() => {
    const savedBudget = localStorage.getItem('budget');
    return savedBudget ? parseFloat(savedBudget) : 0;
  });
  const [currentAmount, setCurrentAmount] = React.useState('0');
  const [showQR, setShowQR] = React.useState(false);
  const [deleteItemId, setDeleteItemId] = React.useState(null);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);

  const toggleQR = () => {
    setShowQR(!showQR);
  };

  const addExpense = (amount, details) => {
    const [name, quantity] = details.split(',').map(item => item.trim());
    const newExpense = {
      id: Date.now(),
      name: name || 'Item',
      quantity: quantity || '1',
      amount: parseFloat(amount),
      date: new Date().toLocaleDateString()
    };
    setExpenses([...expenses, newExpense]);
  };

  const deleteExpense = (id) => {
    setExpenses(expenses.filter(expense => expense.id !== id));
  };

  const handleDeleteClick = (id) => {
    setDeleteItemId(id);
  };

  const confirmDelete = () => {
    if (deleteItemId !== null) {
      setExpenses(expenses.filter(expense => expense.id !== deleteItemId));
      setDeleteItemId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteItemId(null);
  };

  const getTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0).toFixed(2);
  };

  const toggleTheme = () => {
    const newTheme = darkMode ? 'light' : 'dark';
    setDarkMode(!darkMode);
    document.body.className = newTheme;
    document.documentElement.style.backgroundColor = newTheme === 'dark' ? '#000000' : '#ffffff';
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setExpenses([]);
    setShowResetConfirm(false);
  };

  React.useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  React.useEffect(() => {
    localStorage.setItem('budget', budget.toString());
  }, [budget]);

  React.useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    document.documentElement.style.backgroundColor = darkMode ? '#000000' : '#ffffff';
    document.body.className = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  React.useEffect(() => {
    // Set initial background color
    document.documentElement.style.backgroundColor = darkMode ? '#000000' : '#ffffff';
    document.body.className = darkMode ? 'dark' : 'light';
  }, []); // Run once on mount

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
      <header className="app-header">
        <div className="qr-section">
          <button onClick={toggleQR} className="qr-toggle">
            QR
          </button>
          {showQR && (
            <div className="qr-overlay" onClick={toggleQR}>
              <div className="qr-popup" onClick={e => e.stopPropagation()}>
                <button className="qr-close" onClick={toggleQR}>Close</button>
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
        <div className="theme-toggle">
          <FiMoon className="moon-icon" />
          <label className="switch">
            <input 
              type="checkbox" 
              checked={!darkMode}
              onChange={toggleTheme}
            />
            <span className="slider round"></span>
          </label>
          <FiSun className="sun-icon" />
        </div>
      </header>

      <div className="app-container">
        <div style={{ display: 'none' }}>
          <Calculator 
            onResult={(amount) => setCurrentAmount(amount)}
            currentAmount={currentAmount}
          />
        </div>
        <ExpenseTracker 
          expenses={expenses}
          currentAmount={currentAmount}
          onAddExpense={addExpense}
          onDeleteExpense={handleDeleteClick}
          totalExpenses={getTotalExpenses()}
          onReset={handleReset}
          budget={budget}
          onBudgetChange={setBudget}
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

const ExpenseTracker = ({ expenses, currentAmount, onAddExpense, onDeleteExpense, totalExpenses, onReset, budget, onBudgetChange }) => {
  const [itemName, setItemName] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [amount, setAmount] = React.useState('1');
  const [isEditingBudget, setIsEditingBudget] = React.useState(false);
  const [tempBudget, setTempBudget] = React.useState(budget.toString());

  const handleBudgetClick = () => {
    setIsEditingBudget(true);
    setTempBudget(budget.toString());
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

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (price && itemName) {
      const total = parseFloat(price) * parseFloat(amount || 1);
      onAddExpense(total.toString(), `${itemName}, ${amount}`);
      setItemName('');
      setPrice('');
      setAmount('1');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Expense Report', pageWidth/2, 20, { align: 'center' });
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth/2, 30, { align: 'center' });
    
    // Add table headers
    doc.setFontSize(12);
    const headers = ['Item', 'Price', 'Amount', 'Total'];
    let y = 50;
    const margin = 20;
    const colWidth = (pageWidth - 2 * margin) / 4;
    
    // Draw headers
    headers.forEach((header, i) => {
      doc.text(header, margin + (i * colWidth), y);
    });
    
    y += 10;
    
    // Draw line under headers
    doc.line(margin, y-5, pageWidth - margin, y-5);
    
    // Add expenses
    doc.setFontSize(10);
    expenses.forEach((expense) => {
      if (y > 270) { // Check if we need a new page
        doc.addPage();
        y = 20;
      }
      
      const price = (expense.amount / parseFloat(expense.quantity)).toFixed(2);
      doc.text(expense.name, margin, y);
      doc.text(`₱${price}`, margin + colWidth, y);
      doc.text(`${expense.quantity}`, margin + 2 * colWidth, y);
      doc.text(`₱${expense.amount.toFixed(2)}`, margin + 3 * colWidth, y);
      y += 10;
    });
    
    // Add total with more right margin
    y += 5;
    doc.line(margin, y-5, pageWidth - margin, y-5);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Expenses: ₱${totalExpenses}`, pageWidth - (margin + 15), y, { align: 'right' });
    
    // Save the PDF
    doc.save('expense-report.pdf');
  };

  return (
    <div className="note-taker">
      <div className="tracker-header">
        <h2>Expense Tracker</h2>

      </div>
      <form onSubmit={handleAddExpense}>
        <div className="expense-input-grid">
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Item"
            className="item-input"
          />
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
        <button type="submit" className="add-expense-btn">Record Item</button>
      </form>
      <div className="expense-header">
        <span className="header-item">Item</span>
        <span className="header-price">Price</span>
        <span className="header-amount">Amount</span>
        <span className="header-total"></span>
        <span className="header-actions"></span>
      </div>
      <div className="notes-list">
        {[...expenses].reverse().map(expense => (
          <div key={expense.id} className="expense-item">
            <div className="expense-details">
              <span className="expense-name">{expense.name}</span>
              <span className="expense-price">₱{(expense.amount / parseFloat(expense.quantity)).toFixed(2)}</span>
              <span className="expense-quantity">×{expense.quantity}</span>
              <span className="expense-total">₱{expense.amount.toFixed(2)}</span>
              <button 
                className="delete-button"
                onClick={() => onDeleteExpense(expense.id)}
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>
      

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

    // Add to history
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

export default App;
