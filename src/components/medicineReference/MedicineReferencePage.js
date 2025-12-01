import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Container,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Chip,
    Box,
    MenuItem,
    InputAdornment,
    Tooltip,
    useTheme,
    useMediaQuery,
    TablePagination,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Search,
    LocalPharmacy,
    Warning,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import ConfirmDialog from '../shared/ConfirmDialog';

export default function MedicineReferencePage() {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [medicineToDelete, setMedicineToDelete] = useState(null);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [dosageFormFilter, setDosageFormFilter] = useState('');

    const [formData, setFormData] = useState({
        generic_name: '',
        brand_name: '',
        formula: '',
        manufacturer: '',
        category: '',
        dosage_form: '',
        standard_packaging: '',
        strength: '',
        prescription_required: false,
        controlled_substance: false,
    });

    const categories = [
        'Painkiller/Antipyretic',
        'Painkiller/Anti-inflammatory',
        'Antibiotic',
        'Antacid',
        'Proton Pump Inhibitor',
        'H2 Blocker',
        'Antiemetic',
        'Antihistamine',
        'Cough Suppressant',
        'Bronchodilator',
        'Vitamin Supplement',
        'Mineral Supplement',
        'Iron Supplement',
        'Antidiabetic',
        'Antihypertensive',
        'Beta Blocker',
        'Statin',
        'Antifungal',
        'Corticosteroid',
        'Antibiotic Eye Drops',
        'Eye Lubricant',
        'Emergency Contraceptive',
        'Anthelmintic',
        'Antidepressant',
        'Anxiolytic',
        'Anticoagulant',
        'Antiplatelet',
        'Muscle Relaxant',
        'Thyroid Hormone',
        'Alpha Blocker',
        'Other',
    ];

    const dosageForms = [
        'tablet',
        'capsule',
        'syrup',
        'injection',
        'cream',
        'ointment',
        'drops',
        'inhaler',
        'powder',
        'suppository',
        'other',
    ];

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchMedicines();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, page, rowsPerPage, categoryFilter, dosageFormFilter]);

    async function fetchMedicines() {
        setLoading(true);
        try {
            let query = supabase
                .from('medicine_reference')
                .select('*', { count: 'exact' })
                .order('brand_name', { ascending: true });

            if (searchTerm) {
                query = query.or(`generic_name.ilike.%${searchTerm}%,brand_name.ilike.%${searchTerm}%,formula.ilike.%${searchTerm}%,manufacturer.ilike.%${searchTerm}%`);
            }

            if (categoryFilter) {
                query = query.eq('category', categoryFilter);
            }

            if (dosageFormFilter) {
                query = query.eq('dosage_form', dosageFormFilter);
            }

            const from = page * rowsPerPage;
            const to = from + rowsPerPage - 1;

            const { data, count, error } = await query.range(from, to);

            if (error) throw error;
            setMedicines(data || []);
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching medicines:', error);
            toast.error('Failed to load medicines');
        } finally {
            setLoading(false);
        }
    }

    const handleOpenDialog = (medicine = null) => {
        if (medicine) {
            setEditingMedicine(medicine);
            setFormData({
                generic_name: medicine.generic_name || '',
                brand_name: medicine.brand_name || '',
                formula: medicine.formula || '',
                manufacturer: medicine.manufacturer || '',
                category: medicine.category || '',
                dosage_form: medicine.dosage_form || '',
                standard_packaging: medicine.standard_packaging || '',
                strength: medicine.strength || '',
                prescription_required: medicine.prescription_required || false,
                controlled_substance: medicine.controlled_substance || false,
            });
        } else {
            setEditingMedicine(null);
            setFormData({
                generic_name: '',
                brand_name: '',
                formula: '',
                manufacturer: '',
                category: '',
                dosage_form: '',
                standard_packaging: '',
                strength: '',
                prescription_required: false,
                controlled_substance: false,
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingMedicine(null);
    };

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingMedicine) {
                // Update existing medicine
                const { error } = await supabase
                    .from('medicine_reference')
                    .update(formData)
                    .eq('id', editingMedicine.id);

                if (error) throw error;
                toast.success('Medicine updated successfully!');
            } else {
                // Create new medicine
                const { error } = await supabase
                    .from('medicine_reference')
                    .insert([formData]);

                if (error) throw error;
                toast.success('Medicine added successfully!');
            }

            handleCloseDialog();
            fetchMedicines();
        } catch (error) {
            console.error('Error saving medicine:', error);
            if (error.code === '23505') {
                toast.error('A medicine with this brand name and strength already exists');
            } else {
                toast.error('Failed to save medicine: ' + error.message);
            }
        }
    };

    const handleDeleteClick = (medicine) => {
        setMedicineToDelete(medicine);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            const { error } = await supabase
                .from('medicine_reference')
                .delete()
                .eq('id', medicineToDelete.id);

            if (error) throw error;
            toast.success('Medicine deleted successfully!');
            fetchMedicines();
        } catch (error) {
            console.error('Error deleting medicine:', error);
            toast.error('Failed to delete medicine: ' + error.message);
        } finally {
            setDeleteDialogOpen(false);
            setMedicineToDelete(null);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Container maxWidth="xl">
            <Box
                display="flex"
                flexDirection={isMobile ? 'column' : 'row'}
                justifyContent="space-between"
                alignItems={isMobile ? 'flex-start' : 'center'}
                gap={2}
                mb={3}
            >
                <Box display="flex" alignItems="center" gap={1}>
                    <LocalPharmacy color="primary" fontSize="large" />
                    <Typography variant="h4" fontWeight={700} color="primary">
                        Medicine Reference Database
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenDialog()}
                    fullWidth={isMobile}
                >
                    Add Medicine
                </Button>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                placeholder="Search by brand, generic name, formula, or manufacturer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                select
                                label="Category"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <MenuItem value="">All Categories</MenuItem>
                                {categories.map((cat) => (
                                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                select
                                label="Dosage Form"
                                value={dosageFormFilter}
                                onChange={(e) => setDosageFormFilter(e.target.value)}
                            >
                                <MenuItem value="">All Forms</MenuItem>
                                {dosageForms.map((form) => (
                                    <MenuItem key={form} value={form}>
                                        {form.charAt(0).toUpperCase() + form.slice(1)}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {loading ? (
                <Typography>Loading...</Typography>
            ) : (
                <Card>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Brand Name</TableCell>
                                    <TableCell>Generic Name</TableCell>
                                    <TableCell>Strength</TableCell>
                                    <TableCell>Form</TableCell>
                                    <TableCell>Category</TableCell>
                                    <TableCell>Manufacturer</TableCell>
                                    <TableCell>Packaging</TableCell>
                                    <TableCell>Rx</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {medicines.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center">
                                            <Typography color="text.secondary">
                                                No medicines found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    medicines.map((medicine) => (
                                        <TableRow key={medicine.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {medicine.brand_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {medicine.generic_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{medicine.strength}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={medicine.dosage_form}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">
                                                    {medicine.category}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">
                                                    {medicine.manufacturer || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">
                                                    {medicine.standard_packaging || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {medicine.prescription_required && (
                                                    <Tooltip title="Prescription Required">
                                                        <Warning color="warning" fontSize="small" />
                                                    </Tooltip>
                                                )}
                                                {medicine.controlled_substance && (
                                                    <Tooltip title="Controlled Substance">
                                                        <Warning color="error" fontSize="small" />
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleOpenDialog(medicine)}
                                                >
                                                    <Edit />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteClick(medicine)}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            )}

            <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle>
                        {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Brand Name"
                                    name="brand_name"
                                    value={formData.brand_name}
                                    onChange={handleChange}
                                    placeholder="e.g., Panadol"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Generic Name"
                                    name="generic_name"
                                    value={formData.generic_name}
                                    onChange={handleChange}
                                    placeholder="e.g., Paracetamol"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Strength"
                                    name="strength"
                                    value={formData.strength}
                                    onChange={handleChange}
                                    placeholder="e.g., 500mg"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    required
                                    label="Dosage Form"
                                    name="dosage_form"
                                    value={formData.dosage_form}
                                    onChange={handleChange}
                                >
                                    {dosageForms.map((form) => (
                                        <MenuItem key={form} value={form}>
                                            {form.charAt(0).toUpperCase() + form.slice(1)}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                >
                                    {categories.map((cat) => (
                                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Manufacturer"
                                    name="manufacturer"
                                    value={formData.manufacturer}
                                    onChange={handleChange}
                                    placeholder="e.g., GlaxoSmithKline"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Formula"
                                    name="formula"
                                    value={formData.formula}
                                    onChange={handleChange}
                                    placeholder="e.g., Paracetamol + Caffeine"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Standard Packaging"
                                    name="standard_packaging"
                                    value={formData.standard_packaging}
                                    onChange={handleChange}
                                    placeholder="e.g., 10 tablets per strip, 10 strips per box"
                                    helperText="Helps auto-fill items per box in product entry"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={formData.prescription_required}
                                            onChange={handleChange}
                                            name="prescription_required"
                                        />
                                    }
                                    label="Prescription Required"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={formData.controlled_substance}
                                            onChange={handleChange}
                                            name="controlled_substance"
                                        />
                                    }
                                    label="Controlled Substance"
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button type="submit" variant="contained">
                            {editingMedicine ? 'Update' : 'Add'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Medicine"
                message={`Are you sure you want to delete "${medicineToDelete?.brand_name}"? This action cannot be undone.`}
            />
        </Container>
    );
}
