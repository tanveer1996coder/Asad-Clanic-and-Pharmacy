import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress, Box, Typography } from '@mui/material';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';

export default function MedicineSearchAutocomplete({ onSelect, label = "Search Medicine Database", ...props }) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [value, setValue] = useState(null);

    useEffect(() => {
        if (!open) {
            setOptions([]);
            return;
        }

        if (inputValue.length < 2) {
            setOptions([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('medicine_reference')
                    .select('*')
                    .or(`brand_name.ilike.%${inputValue}%,generic_name.ilike.%${inputValue}%`)
                    .limit(20);

                if (error) throw error;
                setOptions(data || []);
            } catch (error) {
                console.error('Error searching medicines:', error);
                setOptions([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [inputValue, open]);

    return (
        <Autocomplete
            value={value}
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            options={options}
            loading={loading}
            getOptionLabel={(option) => {
                const parts = [option.brand_name];
                if (option.strength) parts.push(option.strength);
                if (option.generic_name) parts.push(`(${option.generic_name})`);
                return parts.join(' ');
            }}
            onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
            }}
            onChange={(event, newValue) => {
                setValue(newValue);
                if (newValue && onSelect) {
                    onSelect(newValue);
                }
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder="Type to search..."
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
            renderOption={(props, option) => (
                <Box component="li" {...props}>
                    <Box>
                        <Typography variant="body2" fontWeight={600}>
                            {option.brand_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {option.generic_name} • {option.strength} • {option.dosage_form}
                        </Typography>
                    </Box>
                </Box>
            )}
            noOptionsText={
                inputValue.length < 2
                    ? "Type at least 2 characters to search"
                    : "No medicines found"
            }
            {...props}
        />
    );
}
