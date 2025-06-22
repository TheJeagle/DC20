import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import './MyCreaturesPage.css';

const MyCreaturesPage = ({ currentUser }) => {
    const [allCreatures, setAllCreatures] = useState([]);
    const [filters, setFilters] = useState({ name: '', type: '', role: '', size: '', level: '' });
    const [sortField, setSortField] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    useEffect(() => {
        const fetchCreatures = async () => {
            if (!currentUser) return;
            try {
                const q = query(
                    collection(db, 'savedCreatures'),
                    where('ownerId', '==', currentUser.uid)
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllCreatures(data);
            } catch (err) {
                console.error('Error fetching creatures:', err);
            }
        };
        fetchCreatures();
    }, [currentUser]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleSort = (field) => {
        const direction = sortField === field && sortDir === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDir(direction);
    };

    const filteredCreatures = allCreatures.filter(c => {
        return (
            (filters.name ? c.name.toLowerCase().includes(filters.name.toLowerCase()) : true) &&
            (filters.type ? c.type.toLowerCase().includes(filters.type.toLowerCase()) : true) &&
            (filters.role ? c.role.toLowerCase().includes(filters.role.toLowerCase()) : true) &&
            (filters.size ? c.size.toLowerCase().includes(filters.size.toLowerCase()) : true) &&
            (filters.level ? String(c.level).includes(filters.level) : true)
        );
    }).sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="my-creatures-container">
            <h2>My Creatures</h2>
            <div className="filters">
                <input placeholder="Name" value={filters.name} onChange={e => handleFilterChange('name', e.target.value)} />
                <input placeholder="Type" value={filters.type} onChange={e => handleFilterChange('type', e.target.value)} />
                <input placeholder="Role" value={filters.role} onChange={e => handleFilterChange('role', e.target.value)} />
                <input placeholder="Size" value={filters.size} onChange={e => handleFilterChange('size', e.target.value)} />
                <input placeholder="Level" value={filters.level} onChange={e => handleFilterChange('level', e.target.value)} />
            </div>
            <table className="creature-table">
                <thead>
                    <tr>
                        <th onClick={() => handleSort('name')}>Name</th>
                        <th onClick={() => handleSort('type')}>Type</th>
                        <th onClick={() => handleSort('role')}>Role</th>
                        <th onClick={() => handleSort('size')}>Size</th>
                        <th onClick={() => handleSort('level')}>Level</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredCreatures.map(creature => (
                        <tr key={creature.id}>
                            <td>{creature.name}</td>
                            <td>{creature.type}</td>
                            <td>{creature.role}</td>
                            <td>{creature.size}</td>
                            <td>{creature.level}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MyCreaturesPage;
