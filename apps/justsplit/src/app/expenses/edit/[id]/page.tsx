"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Paper,
  Divider,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ExpenseSplitter from '../../../../components/ExpenseSplitter';

// Mock data - replace with your actual data fetching
const mockUsers = [
  { id: '1', name: 'User 1' },
  { id: '2', name: 'User 2' },
  { id: '3', name: 'User 3' }
];

// Mock expense - replace with your API call
const getMockExpense = (id: string) => ({
  id,
  title: 'Dinner at Restaurant',
  amount: 150,
  date: new Date(),
  description: 'Group dinner',
  paidById: '1',
  currency: 'USD',
  category: 'food',
  splitMethod: 'equal',
  participants: [
    { id: '1', name: 'User 1', share: 50 },
    { id: '2', name: 'User 2', share: 50 },
    { id: '3', name: 'User 3', share: 50 }
  ]
});

type Participant = {
  id: string;
  name: string;
  share: number;
};

const EditExpensePage = () => {
  const params = useParams();
  const router = useRouter();
  const expenseId = params?.id ? (params.id as string) : '';
  
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<Date | null>(new Date());
  const [description, setDescription] = useState('');
  const [paidById, setPaidById] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState('equal');
  const [participantShares, setParticipantShares] = useState<Participant[]>([]);

  useEffect(() => {
    // Fetch expense data
    const fetchExpense = async () => {
      try {
        // In a real app, you would fetch from your API
        // const response = await fetch(`/api/expenses/${expenseId}`);
        // const data = await response.json();
        
        // Using mock data for this example
        const data = getMockExpense(expenseId);
        
        setTitle(data.title);
        setAmount(data.amount);
        setDate(new Date(data.date));
        setDescription(data.description);
        setPaidById(data.paidById);
        setCurrency(data.currency);
        setCategory(data.category);
        setSplitMethod(data.splitMethod);
        
        const participantIds = data.participants.map(p => p.id);
        setSelectedParticipants(participantIds);
        setParticipantShares(data.participants);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching expense:', error);
        setLoading(false);
      }
    };
    
    fetchExpense();
  }, [expenseId]);

  const handleAddParticipant = (userId: string) => {
    if (!selectedParticipants.includes(userId)) {
      const newSelectedParticipants = [...selectedParticipants, userId];
      setSelectedParticipants(newSelectedParticipants);
      
      // Add user to participants with shares
      const user = mockUsers.find(u => u.id === userId);
      if (user) {
        setParticipantShares(prev => [
          ...prev,
          {
            id: user.id,
            name: user.name,
            share: 0 // Will be calculated by ExpenseSplitter based on method
          }
        ]);
      }
    }
  };

  const handleRemoveParticipant = (userId: string) => {
    setSelectedParticipants(selectedParticipants.filter(id => id !== userId));
    setParticipantShares(participantShares.filter(p => p.id !== userId));
  };

  const handleSharesChange = (updatedParticipants: Participant[]) => {
    setParticipantShares(updatedParticipants);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseFloat(e.target.value) || 0;
    setAmount(newAmount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct expense object
    const expenseData = {
      id: expenseId,
      title,
      amount,
      date,
      description,
      paidById,
      currency,
      category,
      splitMethod,
      participants: participantShares,
      // Add other necessary fields
    };
    
    console.log('Updating expense:', expenseData);
    // Call your API to update the expense
    // ...
    
    // Redirect back to expense detail view
    router.push(`/expenses/${expenseId}`);
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Edit Expense
      </Typography>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Title"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              margin="normal"
            />
          </Box>
          
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={handleAmountChange}
              required
              sx={{ flexGrow: 1 }}
            />
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Currency</InputLabel>
              <Select
                value={currency}
                label="Currency"
                onChange={(e) => setCurrency(e.target.value)}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
                <MenuItem value="MXN">MXN</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date"
                value={date}
                onChange={(newDate) => setDate(newDate)}
                sx={{ width: '100%' }}
              />
            </LocalizationProvider>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
            />
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value)}
              >
                <MenuItem value="food">Food & Drinks</MenuItem>
                <MenuItem value="transportation">Transportation</MenuItem>
                <MenuItem value="accommodation">Accommodation</MenuItem>
                <MenuItem value="entertainment">Entertainment</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Paid By</InputLabel>
              <Select
                value={paidById}
                label="Paid By"
                onChange={(e) => setPaidById(e.target.value)}
                required
              >
                {mockUsers.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Participants
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Add Participant</InputLabel>
              <Select
                value=""
                label="Add Participant"
                onChange={(e) => handleAddParticipant(e.target.value)}
              >
                {mockUsers
                  .filter(user => !selectedParticipants.includes(user.id))
                  .map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            {selectedParticipants.length > 0 ? (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Participants:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedParticipants.map(id => {
                    const user = mockUsers.find(u => u.id === id);
                    return user ? (
                      <Button 
                        key={id}
                        variant="outlined"
                        size="small"
                        onClick={() => handleRemoveParticipant(id)}
                        sx={{ mb: 1 }}
                      >
                        {user.name} ✕
                      </Button>
                    ) : null;
                  })}
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No participants selected. Add at least one participant.
              </Typography>
            )}
          </Box>
          
          {selectedParticipants.length > 0 && (
            <ExpenseSplitter
              participants={participantShares}
              totalAmount={amount}
              splitMethod={splitMethod}
              onSplitMethodChange={setSplitMethod}
              onSharesChange={handleSharesChange}
            />
          )}
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              type="submit"
              disabled={selectedParticipants.length === 0 || !paidById}
            >
              Update Expense
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default EditExpensePage;
