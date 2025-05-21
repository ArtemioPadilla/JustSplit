import React, { useState, useEffect } from 'react';
import { 
  Box, 
  FormControl, 
  FormLabel, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  TextField, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  InputAdornment,
  Alert,
  Tooltip,
  IconButton,
  Chip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import { Participant } from '../../types';

type ExpenseSplitterProps = {
  participants: Participant[];
  totalAmount: number;
  splitMethod: string;
  onSplitMethodChange: (method: string) => void;
  onSharesChange: (participants: Participant[]) => void;
};

const ExpenseSplitter: React.FC<ExpenseSplitterProps> = ({
  participants,
  totalAmount,
  splitMethod,
  onSplitMethodChange,
  onSharesChange,
}) => {
  const [localParticipants, setLocalParticipants] = useState<Participant[]>([]);
  
  // Initialize participants or update when key props change
  useEffect(() => {
    if (participants.length > 0) {
      // Don't update parent state from here to avoid infinite loop
      let updatedParticipants = [...participants];
      
      if (splitMethod === 'equal') {
        const equalShare = totalAmount > 0 ? +(totalAmount / participants.length).toFixed(2) : 0;
        updatedParticipants = participants.map(p => ({
          ...p,
          share: equalShare
        }));
      } else if (splitMethod === 'percentage' && 
                !participants.some(p => p.share > 0)) {
        // Initialize with equal percentages ONLY if not already set
        const equalPercentage = participants.length > 0 ? +(100 / participants.length).toFixed(2) : 0;
        updatedParticipants = participants.map(p => ({
          ...p,
          share: equalPercentage
        }));
      }
      
      setLocalParticipants(updatedParticipants);
      
      // Avoid calling this on every render - only when necessary props change
      if (JSON.stringify(participants.map(p => p.share)) !== 
          JSON.stringify(updatedParticipants.map(p => p.share))) {
        onSharesChange(updatedParticipants);
      }
    }
  }, [participants, totalAmount, splitMethod]);

  const handleSplitMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const method = event.target.value;
    onSplitMethodChange(method);
  };

  const handleShareChange = (participantId: string, newShare: number) => {
    const updatedParticipants = localParticipants.map(p => {
      if (p.id === participantId) {
        return { ...p, share: newShare };
      }
      return p;
    });
    
    setLocalParticipants(updatedParticipants);
    onSharesChange(updatedParticipants);
  };

  const calculateTotal = () => {
    if (splitMethod === 'equal') {
      return totalAmount;
    }
    
    if (splitMethod === 'custom') {
      return localParticipants.reduce((sum, p) => sum + p.share, 0);
    }
    
    if (splitMethod === 'percentage') {
      const percentageTotal = localParticipants.reduce((sum, p) => sum + p.share, 0);
      return percentageTotal;
    }
    
    return 0;
  };

  const calculateActualAmount = (participant: Participant) => {
    if (splitMethod === 'percentage') {
      return +(totalAmount * participant.share / 100).toFixed(2);
    }
    return participant.share;
  };
  
  // Format currency consistently
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Calculate if the split is valid
  const isValidSplit = () => {
    if (splitMethod === 'percentage') {
      const total = calculateTotal();
      return Math.abs(total - 100) < 0.01; // Allow for tiny floating point differences
    }
    
    if (splitMethod === 'custom') {
      const total = calculateTotal();
      return Math.abs(total - totalAmount) < 0.01;
    }
    
    return true;
  };
  
  // Get explanation text for the current split method
  const getSplitMethodExplanation = () => {
    switch(splitMethod) {
      case 'equal':
        return `The total amount of ${formatCurrency(totalAmount)} will be split equally among all ${participants.length} participants. Each person will pay ${formatCurrency(totalAmount / participants.length)}.`;
      case 'custom':
        return "Enter a specific amount that each person will pay. The sum should equal the total expense.";
      case 'percentage':
        return "Specify what percentage of the total each person should pay. The percentages should sum to 100%.";
      default:
        return "";
    }
  };

  return (
    <Box sx={{ my: 3 }}>
      <FormControl component="fieldset">
        <FormLabel component="legend">Splitting Method</FormLabel>
        <RadioGroup
          row
          name="splitMethod"
          value={splitMethod}
          onChange={handleSplitMethodChange}
        >
          <FormControlLabel value="equal" control={<Radio />} label="Equal" />
          <FormControlLabel value="custom" control={<Radio />} label="Custom Amounts" />
          <FormControlLabel value="percentage" control={<Radio />} label="Percentage" />
        </RadioGroup>
      </FormControl>
      
      {/* Explanation of the selected split method */}
      <Box sx={{ mt: 2, mb: 3, display: 'flex', alignItems: 'center' }}>
        <Tooltip title={getSplitMethodExplanation()}>
          <IconButton size="small" sx={{ mr: 1 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="body2" color="text.secondary">
          {getSplitMethodExplanation()}
        </Typography>
      </Box>

      {localParticipants.length > 0 && (
        <>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Participant</TableCell>
                  <TableCell align="right">
                    {splitMethod === 'percentage' ? 'Percentage (%)' : 'Amount'}
                  </TableCell>
                  {splitMethod === 'percentage' && <TableCell align="right">Actual Amount</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {localParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell component="th" scope="row">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
                        {participant.name}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={participant.share}
                        onChange={(e) => handleShareChange(participant.id, parseFloat(e.target.value) || 0)}
                        disabled={splitMethod === 'equal'}
                        InputProps={{
                          endAdornment: splitMethod === 'percentage' ? (
                            <InputAdornment position="end">%</InputAdornment>
                          ) : (
                            <InputAdornment position="end">$</InputAdornment>
                          ),
                          inputProps: { 
                            min: 0,
                            step: splitMethod === 'percentage' ? 0.01 : 0.01
                          }
                        }}
                        sx={{ 
                          width: '120px',
                          '& input': { textAlign: 'right' }
                        }}
                      />
                    </TableCell>
                    {splitMethod === 'percentage' && (
                      <TableCell align="right">
                        <Chip 
                          label={formatCurrency(calculateActualAmount(participant))} 
                          variant="outlined" 
                          color="primary"
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                    Total
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {splitMethod === 'percentage' 
                      ? `${calculateTotal().toFixed(2)}%` 
                      : formatCurrency(calculateTotal())}
                  </TableCell>
                  {splitMethod === 'percentage' && (
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(totalAmount)}
                    </TableCell>
                  )}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Validation feedback */}
          {!isValidSplit() && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {splitMethod === 'percentage'
                ? `The percentages should sum to 100%. Current total: ${calculateTotal().toFixed(2)}%`
                : `The total amount should equal ${formatCurrency(totalAmount)}. Current total: ${formatCurrency(calculateTotal())}`}
            </Alert>
          )}
          
          {/* Summary */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #eee' }}>
            <Typography variant="subtitle2" gutterBottom>
              Summary
            </Typography>
            <Typography variant="body2">
              {splitMethod === 'equal' && `Each person pays ${formatCurrency(totalAmount / participants.length)}`}
              {splitMethod === 'custom' && `Total to be paid: ${formatCurrency(calculateTotal())}`}
              {splitMethod === 'percentage' && `Total expense: ${formatCurrency(totalAmount)}`}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ExpenseSplitter;
