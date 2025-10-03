import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import './MyCreaturesPage.css';

const textSortCollator = typeof Intl !== 'undefined' && typeof Intl.Collator === 'function'
    ? new Intl.Collator(undefined, { sensitivity: 'base' })
    : null;

const getSortableValue = (creature, field) => {
    const value = creature?.[field];

    if (field === 'level') {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
    }

    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'string') {
        return value.toLowerCase();
    }

    return String(value).toLowerCase();
};

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
                const data = snapshot.docs.map(doc => {
                    const d = doc.data();
                    return { id: doc.id, ...d, actions: d.actions || [] };
                });
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

    const normalizedFilters = {
        name: filters.name.trim().toLowerCase(),
        type: filters.type.trim().toLowerCase(),
        role: filters.role.trim().toLowerCase(),
        size: filters.size.trim().toLowerCase(),
        level: filters.level.trim()
    };

    const filteredCreatures = allCreatures.filter(creature => (
        (!normalizedFilters.name || getSortableValue(creature, 'name').includes(normalizedFilters.name)) &&
        (!normalizedFilters.type || getSortableValue(creature, 'type').includes(normalizedFilters.type)) &&
        (!normalizedFilters.role || getSortableValue(creature, 'role').includes(normalizedFilters.role)) &&
        (!normalizedFilters.size || getSortableValue(creature, 'size').includes(normalizedFilters.size)) &&
        (!normalizedFilters.level || String(getSortableValue(creature, 'level')).includes(normalizedFilters.level))
    )).sort((a, b) => {
        const aVal = getSortableValue(a, sortField);
        const bVal = getSortableValue(b, sortField);

        if (sortField === 'level') {
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const compareResult = textSortCollator
            ? textSortCollator.compare(aVal, bVal)
            : aVal.localeCompare(bVal);

        return sortDir === 'asc' ? compareResult : -compareResult;
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
