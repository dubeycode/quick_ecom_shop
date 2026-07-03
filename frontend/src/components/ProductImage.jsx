import { getProductImage } from '../data/products';

export default function ProductImage({ name, className = '', alt }) {
  const src = getProductImage(name);

  if (!src) {
    return (
      <div className={`product-image product-image--placeholder ${className}`}>
        <span>{name?.charAt(0) || '?'}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || name}
      className={`product-image ${className}`}
      loading="lazy"
    />
  );
}
